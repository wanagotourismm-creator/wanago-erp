import { auth } from "@/lib/firebase/client";

// Each recipient gets their OWN body (their own tracking link baked in) —
// never a single shared message, since the whole point of the link is
// attributing conversions back to the right person.
export type BulkEmailRecipient = { email: string; subject: string; body: string };
export type BulkEmailResult = { sent: number; failed: number };

// Real automated sending (unlike WhatsApp's wa.me links, which always
// require one manual click per message — there's no equivalent no-click
// bulk path without the paid Meta template-message flow, which doesn't
// apply here anyway since these are opt-in partners, not cold contacts).
// Uses the same authenticated /api/notify/email route as the rest of the
// app; each send is independent so one failure doesn't stop the batch.
export async function sendBulkKitEmails(recipients: BulkEmailRecipient[]): Promise<BulkEmailResult> {
  const idToken = await auth.currentUser?.getIdToken().catch(() => null);
  let sent = 0, failed = 0;

  for (const r of recipients) {
    try {
      const res = await fetch("/api/notify/email", {
        method: "POST",
        headers: { "content-type": "application/json", ...(idToken ? { authorization: `Bearer ${idToken}` } : {}) },
        body: JSON.stringify({ to: r.email, subject: r.subject, body: r.body }),
      });
      if (res.ok) sent += 1; else failed += 1;
    } catch {
      failed += 1;
    }
  }

  return { sent, failed };
}
