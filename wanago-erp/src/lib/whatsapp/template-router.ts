import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { phoneMatchKey } from "@/lib/utils/helpers";
import { sendWhatsAppMessage, sendWhatsAppTemplate, type SendWhatsAppResult } from "@/lib/whatsapp/meta-client";

const WINDOW_MS = 24 * 60 * 60 * 1000;

// Scans whatsappConversations and matches by last-10-digits rather than an
// exact `==` on phoneNumber — Customer/Lead phone fields are stored however
// they were typed in, while whatsappConversations.phoneNumber is always the
// E.164 string the webhook derived. Same precedent as the webhook's own
// findCustomerByPhone. A miss here only fails toward the safe side (treated
// as outside the window below), never toward a doomed plain-text send.
async function findLastInboundMessageAt(db: NonNullable<ReturnType<typeof getAdminDb>>, phone: string): Promise<number | null> {
  const key = phoneMatchKey(phone);
  if (!key) return null;
  const snap = await db.collection(FIRESTORE_COLLECTIONS.WHATSAPP_CONVERSATIONS).get();
  const match = snap.docs.find((d) => phoneMatchKey(d.data().phoneNumber as string) === key);
  const ts = match?.data().lastInboundMessageAt as { toMillis?: () => number } | undefined;
  return ts?.toMillis?.() ?? null;
}

// Picks the approved+active template registered for `purpose`, if any.
async function findApprovedTemplate(db: NonNullable<ReturnType<typeof getAdminDb>>, purpose: string) {
  const snap = await db.collection(FIRESTORE_COLLECTIONS.WHATSAPP_TEMPLATES)
    .where("purpose", "==", purpose)
    .where("approvalStatus", "==", "approved")
    .where("isActive", "==", true)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].data() as { metaTemplateName: string; language: string };
}

// Routes a business-initiated WhatsApp send between plain text (inside the
// customer's 24h session window) and an approved template (outside it) —
// see meta-client.ts's file comment for why the window matters at all.
// Best-effort by design, same as every existing call site: callers already
// wrap this in .catch(() => {}), so a returned { ok: false } here is not a
// new failure mode, just a more specific one than "the plain-text send
// failed for some reason" was before this existed.
export async function sendWhatsAppSmart(params: {
  to: string; purpose: string; variables: string[]; fallbackBody: string;
}): Promise<SendWhatsAppResult> {
  const db = getAdminDb();
  if (!db) return sendWhatsAppMessage(params.to, params.fallbackBody);

  const lastInboundAt = await findLastInboundMessageAt(db, params.to);
  if (lastInboundAt && Date.now() - lastInboundAt < WINDOW_MS) {
    return sendWhatsAppMessage(params.to, params.fallbackBody);
  }

  const template = await findApprovedTemplate(db, params.purpose);
  if (!template) {
    return {
      ok: false,
      error: `Outside the 24h WhatsApp window and no approved template is registered for "${params.purpose}" — add one in Admin → WhatsApp Templates.`,
    };
  }
  return sendWhatsAppTemplate(params.to, template.metaTemplateName, template.language, params.variables);
}
