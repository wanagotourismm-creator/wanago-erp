import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getIntegrationSecret } from "@/lib/get-integration-secret";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { CallOutcome } from "@/modules/call-logs/types";

export const runtime = "nodejs";

// Exotel's Status -> this app's CallOutcome. "failed" has no exact
// equivalent in the existing manual-logging vocabulary (connected/
// no_answer/busy/wrong_number) — "wrong_number" is the closest fit for "the
// call could not be completed" without inventing a new outcome value just
// for this one provider.
const STATUS_TO_OUTCOME: Record<string, CallOutcome> = {
  completed:  "connected",
  "no-answer": "no_answer",
  busy:       "busy",
  failed:     "wrong_number",
};

// Public route — Exotel calls this directly, there's no user session to
// authenticate. Exotel doesn't document any HMAC/signature scheme for its
// StatusCallback (unlike Meta's WhatsApp webhook, which this codebase does
// verify via HMAC — see /api/whatsapp/webhook/route.ts), so verification
// here is a shared secret embedded in the callback URL itself instead —
// the practical equivalent given what the provider actually supports.
export async function POST(req: NextRequest) {
  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server isn't configured for this yet" }, { status: 501 });

  const expectedToken = await getIntegrationSecret("callingWebhookToken");
  const providedToken = req.nextUrl.searchParams.get("token");
  if (!expectedToken || providedToken !== expectedToken) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  // Exotel POSTs form-encoded, not JSON.
  const form = await req.formData();
  const callSid = form.get("CallSid")?.toString();
  if (!callSid) return NextResponse.json({ error: "Missing CallSid" }, { status: 400 });

  const statusRaw = form.get("Status")?.toString() ?? "";
  const recordingUrl = form.get("RecordingUrl")?.toString() || null;
  // Field name not confirmed against a live payload yet — check a couple
  // of likely variants and degrade to null rather than guessing wrong.
  const durationRaw = form.get("Duration")?.toString() ?? form.get("ConversationDuration")?.toString();
  const durationMinutes = durationRaw ? Math.round(Number(durationRaw) / 60) : null;

  const outcome = STATUS_TO_OUTCOME[statusRaw] ?? "connected";

  const snap = await db.collection(FIRESTORE_COLLECTIONS.CALL_LOGS)
    .where("externalCallSid", "==", callSid)
    .limit(1)
    .get();
  if (snap.empty) {
    // Nothing to update — acknowledge anyway so Exotel doesn't retry
    // indefinitely against a call log that (for whatever reason) was
    // never created or has since been deleted.
    return NextResponse.json({ ok: true, matched: false });
  }

  await snap.docs[0].ref.update({
    outcome,
    recordingUrl,
    durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true, matched: true });
}
