import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { FieldValue, type Firestore, type DocumentReference } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getIntegrationSecret } from "@/lib/get-integration-secret";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { phoneMatchKey } from "@/lib/utils/helpers";
import { classifyInboundMessage } from "@/modules/whatsapp-inbox/services/whatsapp-classify.service";

export const runtime = "nodejs";

type MetaWebhookPayload = {
  entry?: { changes?: { value?: MetaChangeValue }[] }[];
};
type MetaChangeValue = {
  contacts?: { profile?: { name?: string } }[];
  messages?: { from: string; id: string; type?: string; text?: { body?: string } }[];
  statuses?: { id: string; status: string }[];
};

// Meta's webhook verification handshake — called once when the webhook URL
// is registered/re-verified in the Meta app dashboard.
export async function GET(req: NextRequest) {
  const verifyToken = await getIntegrationSecret("metaWhatsappVerifyToken", "META_WHATSAPP_VERIFY_TOKEN");
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && verifyToken && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// Confirms the payload really came from Meta (HMAC of the raw body, keyed
// with the app secret) rather than trusting an arbitrary POST to this
// public URL. If no app secret is configured yet, payloads are accepted
// unverified so setup can proceed before that field is filled in.
async function verifySignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const appSecret = await getIntegrationSecret("metaWhatsappAppSecret", "META_WHATSAPP_APP_SECRET");
  if (!appSecret) return true;
  const signature = req.headers.get("x-hub-signature-256");
  if (!signature?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const provided = signature.slice(7);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
  } catch {
    return false;
  }
}

// Small-business scale — a full collection scan is acceptable here; if the
// customer list ever grows past a few thousand rows, add an indexed
// phoneMatchKey field to Customer (matches how call-logs/other modules
// avoid composite indexes by filtering client/server-side instead).
async function findCustomerByPhone(db: Firestore, phone: string) {
  const key = phoneMatchKey(phone);
  if (!key) return null;
  const snap = await db.collection(FIRESTORE_COLLECTIONS.CUSTOMERS).get();
  const match = snap.docs.find((d) => phoneMatchKey(d.data().phone as string) === key);
  return match ? { id: match.id, fullName: match.data().fullName as string | undefined } : null;
}

type ConversationHandle = {
  id: string;
  ref: DocumentReference;
  data: () => { customerName: string | null };
};

// Wrapped in a transaction (Admin SDK transactions, unlike the client SDK,
// can tx.get() a query) — the plain query-then-create this used to be let
// two webhook deliveries for the same new phone number arriving close
// together (Meta retries/batches) both see "no existing conversation" and
// each create their own, splitting that customer's thread in two.
async function findOrCreateConversation(
  db: Firestore, phoneNumber: string, waProfileName: string | null
): Promise<ConversationHandle> {
  const conversations = db.collection(FIRESTORE_COLLECTIONS.WHATSAPP_CONVERSATIONS);

  return db.runTransaction(async (tx) => {
    const existing = await tx.get(conversations.where("phoneNumber", "==", phoneNumber).limit(1));
    if (!existing.empty) {
      const doc = existing.docs[0];
      return { id: doc.id, ref: doc.ref, data: () => ({ customerName: (doc.data().customerName as string | null) ?? null }) };
    }

    const customer = await findCustomerByPhone(db, phoneNumber);
    const customerName = customer?.fullName ?? waProfileName ?? null;
    const now = FieldValue.serverTimestamp();
    const ref = conversations.doc();
    tx.set(ref, {
      phoneNumber,
      customerId:   customer?.id ?? null,
      customerName,
      lastMessagePreview:   null,
      lastMessageAt:        now,
      lastMessageDirection: null,
      unreadCount: 0,
      sentiment: null,
      intent:    null,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
      status:    "active",
    });
    return { id: ref.id, ref, data: () => ({ customerName }) };
  });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!(await verifySignature(req, rawBody))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) return NextResponse.json({ received: true });

  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ received: true });
  }

  try {
    const changes = payload.entry?.flatMap((e) => e.changes ?? []) ?? [];
    for (const change of changes) {
      const value = change.value ?? {};
      const profileName = value.contacts?.[0]?.profile?.name ?? null;

      for (const msg of value.messages ?? []) {
        const phoneNumber = `+${msg.from}`;
        const convoDoc = await findOrCreateConversation(db, phoneNumber, profileName);
        const body = msg.text?.body ?? (msg.type ? `[${msg.type} message]` : "");
        const now = FieldValue.serverTimestamp();

        await db.collection(FIRESTORE_COLLECTIONS.WHATSAPP_MESSAGES).add({
          conversationId: convoDoc.id,
          direction:      "inbound",
          body,
          waMessageId:    msg.id ?? null,
          deliveryStatus: "received",
          sentBy:         null,
          sentByName:     null,
          createdAt: now,
          updatedAt: now,
          createdBy: "system",
          status:    "active",
        });

        await convoDoc.ref.update({
          lastMessagePreview:   body.slice(0, 200),
          lastMessageAt:        now,
          lastMessageDirection: "inbound",
          lastInboundMessageAt: now,
          unreadCount:  FieldValue.increment(1),
          customerName: convoDoc.data()?.customerName ?? profileName,
          updatedAt: now,
        });

        // Best-effort — a classification failure (rate limit, malformed
        // response) must never block message delivery above, which is why
        // this runs after that write, not before, and swallows its own
        // errors (classifyInboundMessage returns null rather than throwing).
        const classification = await classifyInboundMessage(body);
        if (classification) {
          await convoDoc.ref.update({
            sentiment: classification.sentiment,
            intent:    classification.intent,
          });
        }
      }

      for (const st of value.statuses ?? []) {
        if (!st.id) continue;
        const matching = await db.collection(FIRESTORE_COLLECTIONS.WHATSAPP_MESSAGES)
          .where("waMessageId", "==", st.id).limit(1).get();
        if (!matching.empty) {
          await matching.docs[0].ref.update({ deliveryStatus: st.status, updatedAt: FieldValue.serverTimestamp() });
        }
      }
    }
  } catch (err) {
    console.error("whatsapp webhook processing failed", err);
  }

  // Meta requires a fast 200 regardless of internal processing outcome —
  // otherwise it retries the same payload and can eventually disable the
  // webhook subscription.
  return NextResponse.json({ received: true });
}
