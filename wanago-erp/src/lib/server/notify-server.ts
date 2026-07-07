import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getIntegrationSecret } from "@/lib/get-integration-secret";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { NotificationCategory } from "@/modules/notifications/types";

function renderEmailHtml(subject: string, body: string, link?: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wanago-erp.vercel.app";
  const cta = link
    ? `<a href="${appUrl}${link}" style="display:inline-block;margin-top:20px;background:#16a34a;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600;">Open Wanago ERP</a>`
    : "";
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
    <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#16a34a;margin:0 0 8px;">Wanago Travel &amp; Co</p>
    <h1 style="font-size:18px;margin:0 0 12px;color:#111;">${subject}</h1>
    <p style="font-size:14px;color:#444;line-height:1.6;white-space:pre-wrap;">${body}</p>
    ${cta}
    <p style="font-size:11px;color:#999;margin-top:32px;">You're receiving this because of activity on your Wanago ERP account.</p>
  </div>`;
}

// Server-side email send — the actual Resend call, shared by the
// client-facing /api/notify/email route and anything running purely
// server-side (like the daily reminders cron) that can't hit its own
// relative API routes.
export async function sendEmail(params: {
  to: string; subject: string; body: string; link?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = await getIntegrationSecret("resendApiKey", "RESEND_API_KEY");
  if (!apiKey) {
    return { ok: false, error: "Email isn't set up yet — add a Resend API key in Admin → Integrations." };
  }

  const fromEmail = await getIntegrationSecret("resendFromEmail", "RESEND_FROM_EMAIL");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: fromEmail || "Wanago HR <onboarding@resend.dev>",
      to: params.to,
      subject: params.subject,
      html: renderEmailHtml(params.subject, params.body, params.link),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Failed to send email: ${text}` };
  }
  return { ok: true };
}

// Server-side equivalent of src/lib/notify.ts's notifyUser() — that one is
// client-oriented (relative fetch to /api/notify/email, client Firestore
// SDK for the in-app write) and doesn't work from a cron route with no
// request/browser context. This writes the in-app notification directly
// via the Admin SDK (matching notification.service.ts's createNotification
// document shape exactly, so it shows up identically in the bell/inbox UI)
// and sends email best-effort, same as the client version.
export async function notifyUserServer(params: {
  userId?:  string | null;
  email?:   string | null;
  title:    string;
  body:     string;
  link?:    string;
  category: NotificationCategory;
}): Promise<void> {
  const db = getAdminDb();
  const tasks: Promise<unknown>[] = [];

  if (db && params.userId) {
    tasks.push(
      db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).add({
        recipientId: params.userId,
        title:       params.title,
        body:        params.body,
        link:        params.link ?? null,
        read:        false,
        category:    params.category,
        createdBy:   params.userId,
        status:      "active",
        createdAt:   FieldValue.serverTimestamp(),
        updatedAt:   FieldValue.serverTimestamp(),
      }).catch(() => {})
    );
  }
  if (params.email) {
    tasks.push(sendEmail({ to: params.email, subject: params.title, body: params.body, link: params.link }).catch(() => {}));
  }

  await Promise.allSettled(tasks);
}
