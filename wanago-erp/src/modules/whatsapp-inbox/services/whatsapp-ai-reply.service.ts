// Server-only — the customer-facing "digital front desk" WhatsApp agent.
// Deliberately separate from the internal AI Employee (api/ai/_lib/*): this
// one talks to the public, not staff, so it has its own narrower trust
// boundary — it may only ever see the one lead/customer/conversation it's
// replying to, never other customers' data, staff notes, or financials.
// Triggered from the webhook (src/app/api/whatsapp/webhook/route.ts) via
// next/server's after(), so Meta gets its fast 200 immediately while this
// runs in the background — same reasoning geminiService.ts's usage-logging
// after() call already established in this codebase.
import { FieldValue, type Firestore, type DocumentReference } from "firebase-admin/firestore";
import { z } from "zod";
import { generateStructured, AiGenerationError } from "@/modules/ai-core/services/geminiService";
import { getCompanySettingsServer } from "@/modules/admin/settings/services/company-settings.server";
import { isAiWhatsAppReplyEnabled } from "@/modules/ai-core/services/ai-settings.server";
import { sendWhatsAppSmart } from "@/lib/whatsapp/template-router";
import { notifyUserServer } from "@/lib/server/notify-server";
import { buildUpiLink } from "@/lib/upi";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { phoneMatchKey } from "@/lib/utils/helpers";

const MAX_HISTORY_MESSAGES = 10;
const MAX_PACKAGES_IN_CONTEXT = 30;

function toMillis(value: unknown): number {
  const ts = value as { toMillis?: () => number } | undefined;
  return typeof ts?.toMillis === "function" ? ts.toMillis() : 0;
}

// ── Lead resolution/creation ────────────────────────────────────
// Scoped to only run when the AI agent actually processes a message (not on
// every webhook hit) — an inbound number shouldn't silently become a
// tracked Lead just because a message arrived if the feature is off.
async function findLeadByPhone(db: Firestore, phone: string) {
  const key = phoneMatchKey(phone);
  if (!key) return null;
  const snap = await db.collection(FIRESTORE_COLLECTIONS.LEADS).get();
  const match = snap.docs.find((d) => phoneMatchKey(d.data().phone as string) === key);
  if (!match) return null;
  const data = match.data();
  return {
    id: match.id,
    refNumber: data.refNumber as string,
  };
}

async function findHeadOffice(db: Firestore): Promise<{ id: string; name: string } | null> {
  const head = await db.collection(FIRESTORE_COLLECTIONS.OFFICES).where("isHeadOffice", "==", true).limit(1).get();
  if (!head.empty) return { id: head.docs[0].id, name: head.docs[0].data().name as string };
  const any = await db.collection(FIRESTORE_COLLECTIONS.OFFICES).limit(1).get();
  if (!any.empty) return { id: any.docs[0].id, name: any.docs[0].data().name as string };
  return null;
}

// Admin-SDK equivalent of src/lib/firebase/ref-counter.ts's nextRefNumber —
// that one uses the client SDK (firebase/firestore), unusable from a
// webhook with no browser/auth context. Same transactional counter-doc
// pattern, same refCounters collection, so ref numbers never collide with
// ones minted by the client-side path.
async function nextRefNumberServer(db: Firestore, prefix: string): Promise<string> {
  const counterRef = db.collection("refCounters").doc(prefix);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists ? (snap.data()!.next as number) : 1001;
    tx.set(counterRef, { next: current + 1 }, { merge: true });
    return `${prefix}-${current}`;
  });
}

async function createLeadFromWhatsApp(db: Firestore, phone: string, name: string | null): Promise<{ id: string; refNumber: string } | null> {
  const office = await findHeadOffice(db);
  if (!office) return null; // no office configured at all — can't satisfy Lead's required officeId/officeName
  const refNumber = await nextRefNumberServer(db, "LD");
  const now = FieldValue.serverTimestamp();
  const ref = db.collection(FIRESTORE_COLLECTIONS.LEADS).doc();
  await ref.set({
    refNumber, name: name || "WhatsApp Inquiry", phone, destination: "Not specified yet",
    email: null, alternatePhone: null, tripType: null, travelDate: null, returnDate: null,
    duration: null, pax: null, budget: null,
    stage: "new", priority: "medium", source: "whatsapp_inbound",
    assignedTo: null, agentName: null, isSelfGenerated: false, marketingOptOut: false,
    officeId: office.id, officeName: office.name, notes: null, referredByCustomerId: null,
    createdBy: "system", status: "active", createdAt: now, updatedAt: now,
  });
  return { id: ref.id, refNumber };
}

// ── Context gathering ────────────────────────────────────────────
async function fetchRecentMessages(db: Firestore, conversationId: string): Promise<{ direction: string; body: string }[]> {
  const snap = await db.collection(FIRESTORE_COLLECTIONS.WHATSAPP_MESSAGES).where("conversationId", "==", conversationId).get();
  return snap.docs
    .map((d) => ({ direction: d.data().direction as string, body: d.data().body as string, createdAt: d.data().createdAt }))
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
    .slice(0, MAX_HISTORY_MESSAGES)
    .reverse()
    .map(({ direction, body }) => ({ direction, body }));
}

type PackageContext = { title: string; destination: string; basePrice: number; durationDays: number; durationNights: number; inclusions: string };

async function fetchActivePackages(db: Firestore): Promise<PackageContext[]> {
  const snap = await db.collection(FIRESTORE_COLLECTIONS.PACKAGES).where("packageStatus", "==", "active").limit(MAX_PACKAGES_IN_CONTEXT).get();
  return snap.docs.map((d) => {
    const p = d.data();
    return {
      title: p.title as string, destination: p.destination as string, basePrice: p.basePrice as number,
      durationDays: p.durationDays as number, durationNights: p.durationNights as number, inclusions: p.inclusions as string,
    };
  });
}

type OfferContext = { title: string; description: string; destination: string | null };

// Only offers that are both isActive AND within their validFrom/validTo
// window today — this is the sole source of truth for "can the AI mention
// a discount," see src/modules/admin/offers/ (Admin > Offers).
async function fetchActiveOffers(db: Firestore): Promise<OfferContext[]> {
  const today = new Date().toISOString().slice(0, 10);
  const snap = await db.collection(FIRESTORE_COLLECTIONS.OFFERS).where("isActive", "==", true).get();
  return snap.docs
    .map((d) => d.data())
    .filter((o) => (o.validFrom as string) <= today && today <= (o.validTo as string))
    .map((o) => ({ title: o.title as string, description: o.description as string, destination: (o.destination as string | null) ?? null }));
}

async function notifyAllAdmins(db: Firestore, title: string, body: string): Promise<void> {
  const snap = await db.collection("users").where("systemRole", "in", ["admin", "super_admin"]).get();
  await Promise.allSettled(
    snap.docs.map((d) => notifyUserServer({ userId: d.id, title, body, link: "/dashboard", category: "followup" }).catch(() => {}))
  );
}

// ── Decision ─────────────────────────────────────────────────────
const decisionSchema = z.object({
  replyText: z.string().min(1),
  needsHuman: z.boolean(),
  requestedCallback: z.boolean().optional(),
  readyToPayAmount: z.number().optional(),
});

const decisionResponseSchema = {
  type: "OBJECT",
  properties: {
    replyText: { type: "STRING" },
    needsHuman: { type: "BOOLEAN" },
    requestedCallback: { type: "BOOLEAN" },
    readyToPayAmount: { type: "NUMBER" },
  },
  required: ["replyText", "needsHuman"],
};

function buildSystemPrompt(companyName: string, packages: PackageContext[], offers: OfferContext[]): string {
  const packagesText = packages.length > 0
    ? packages.map((p) => `- ${p.title} (${p.destination}, ${p.durationDays}D/${p.durationNights}N): Rs.${p.basePrice} — ${p.inclusions}`).join("\n")
    : "(no active packages on file — say you'll have someone follow up with options rather than describing any package)";
  const offersText = offers.length > 0
    ? offers.map((o) => `- ${o.title}${o.destination ? ` (${o.destination})` : " (all destinations)"}: ${o.description}`).join("\n")
    : "(no active offers right now — do not mention any discount or promotion)";

  return [
    `You are the WhatsApp assistant for ${companyName}, a travel agency, replying to an inbound customer message.`,
    "",
    "Non-negotiable rules:",
    "- Only ever state a price, destination, package detail, or discount/offer that appears in the lists below. NEVER invent one.",
    "- If you don't know the answer, or the request is complex (custom itinerary, a complaint, price negotiation, anything not covered below), say so honestly and set needsHuman=true — never guess.",
    "- Keep replies short and warm, like a real WhatsApp message (2-4 sentences), plain text, no markdown.",
    "- If the customer clearly wants a callback or a consultation, set requestedCallback=true AND needsHuman=true, and tell them a human will reach out soon.",
    "- If the customer explicitly confirms they're ready to pay/book and states or confirms an amount, set readyToPayAmount to that amount (a real payment link is attached automatically after your reply) and set needsHuman=true so a human completes the booking.",
    "- Never claim a payment was received, a booking is confirmed, or anything you can't actually verify from what's given to you.",
    "",
    "Active packages:",
    packagesText,
    "",
    "Active offers/discounts:",
    offersText,
  ].join("\n");
}

function buildPrompt(history: { direction: string; body: string }[], latest: string): string {
  const transcript = history.map((h) => `${h.direction === "inbound" ? "Customer" : "Us"}: ${h.body}`);
  return [...transcript, `Customer: ${latest}`, "", "Decide your reply."].join("\n");
}

export type WhatsAppAiReplyInput = {
  db: Firestore;
  conversationId: string;
  conversationRef: DocumentReference;
  phoneNumber: string;
  inboundBody: string;
  customerName: string | null;
};

export async function generateAndSendAiReply(input: WhatsAppAiReplyInput): Promise<void> {
  if (!(await isAiWhatsAppReplyEnabled())) return;
  if (!input.inboundBody.trim()) return;

  try {
    const convoSnap = await input.conversationRef.get();
    const convo = convoSnap.data();
    if (!convo || convo.aiReplyPaused === true) return; // already escalated — a human owns this thread now

    // Existing customers are left alone (they're already tracked); a
    // genuinely new inquiry with no customer match gets turned into a
    // trackable Lead so it doesn't just vanish into an unlinked thread.
    let lead: { id: string; refNumber: string } | null = null;
    if (!convo.customerId) {
      lead = await findLeadByPhone(input.db, input.phoneNumber);
      if (!lead) lead = await createLeadFromWhatsApp(input.db, input.phoneNumber, input.customerName);
    }

    const [history, packages, offers, company] = await Promise.all([
      fetchRecentMessages(input.db, input.conversationId),
      fetchActivePackages(input.db),
      fetchActiveOffers(input.db),
      getCompanySettingsServer(),
    ]);

    let decision;
    try {
      decision = await generateStructured({
        feature: "whatsapp-ai-reply",
        system: buildSystemPrompt(company.businessName, packages, offers),
        prompt: buildPrompt(history, input.inboundBody),
        schema: decisionSchema,
        responseSchema: decisionResponseSchema,
        createdBy: "system",
      });
    } catch (err) {
      if (err instanceof AiGenerationError) return; // no provider configured — silently skip, same as classifyInboundMessage
      throw err;
    }

    let replyText = decision.replyText.trim();
    if (decision.readyToPayAmount && company.upiId) {
      const link = buildUpiLink({
        payeeVpa: company.upiId, payeeName: company.businessName, amount: decision.readyToPayAmount,
        note: `Booking advance${lead ? ` - ${lead.refNumber}` : ""}`, refId: lead?.refNumber ?? input.conversationId,
      });
      replyText += `\n\nYou can pay securely here: ${link}`;
    }

    const result = await sendWhatsAppSmart({ to: input.phoneNumber, purpose: "ai_auto_reply", variables: [], fallbackBody: replyText });
    if (result.ok) {
      const now = FieldValue.serverTimestamp();
      await input.db.collection(FIRESTORE_COLLECTIONS.WHATSAPP_MESSAGES).add({
        conversationId: input.conversationId, direction: "outbound", body: replyText,
        waMessageId: result.messageId || null, deliveryStatus: "sent",
        sentBy: "ai", sentByName: "AI Assistant",
        createdAt: now, updatedAt: now, createdBy: "system", status: "active",
      });
      await input.conversationRef.update({
        lastMessagePreview: replyText.slice(0, 200), lastMessageAt: now, lastMessageDirection: "outbound",
        updatedAt: now,
        ...(decision.needsHuman ? { aiReplyPaused: true } : {}),
      });
    }

    if (decision.needsHuman) {
      const title = `WhatsApp: ${input.customerName || input.phoneNumber} needs you`;
      const body = decision.requestedCallback
        ? `Requested a callback. Last message: "${input.inboundBody.slice(0, 150)}"`
        : `AI couldn't fully help. Last message: "${input.inboundBody.slice(0, 150)}"`;
      if (convo.assignedTo) {
        await notifyUserServer({ userId: convo.assignedTo, title, body, link: "/dashboard", category: "followup" }).catch(() => {});
      } else {
        await notifyAllAdmins(input.db, title, body);
      }
    }
  } catch (err) {
    // Best-effort, same contract as classifyInboundMessage — a failure here
    // must never surface anywhere the customer or the webhook caller sees.
    console.error("[whatsapp-ai-reply] failed", err);
  }
}
