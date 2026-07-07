import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getIntegrationSecret } from "@/lib/get-integration-secret";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { NotificationCategory } from "@/modules/notifications/types";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://wanago-erp.vercel.app";
}

function renderEmailHtml(subject: string, body: string, link?: string) {
  const cta = link
    ? `<a href="${appUrl()}${link}" style="display:inline-block;margin-top:20px;background:#16a34a;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600;">Open Wanago ERP</a>`
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

const TRAVEL_QUOTES: { text: string; author: string }[] = [
  { text: "The world is a book, and those who do not travel read only one page.", author: "Saint Augustine" },
  { text: "Travel is the only thing you buy that makes you richer.", author: "Anonymous" },
  { text: "Not all those who wander are lost.", author: "J.R.R. Tolkien" },
  { text: "Life is either a daring adventure or nothing at all.", author: "Helen Keller" },
  { text: "To travel is to live.", author: "Hans Christian Andersen" },
  { text: "Adventure is worthwhile in itself.", author: "Amelia Earhart" },
  { text: "Travel far enough, you meet yourself.", author: "David Mitchell" },
  { text: "It is not the destination, it's the journey.", author: "Ralph Waldo Emerson" },
  { text: "Once a year, go someplace you've never been before.", author: "Dalai Lama" },
  { text: "Travel makes one modest. You see what a tiny place you occupy in the world.", author: "Gustave Flaubert" },
  { text: "We travel not to escape life, but for life not to escape us.", author: "Anonymous" },
  { text: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
];

function renderWelcomeEmailHtml(fullName: string, designation: string) {
  const quote = TRAVEL_QUOTES[Math.floor(Math.random() * TRAVEL_QUOTES.length)];
  const logoUrl = `${appUrl()}/images/logo-dark-clean.png`;
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;background:#f4f4f5;padding:32px 16px;">
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 24px;text-align:center;">
        <img src="${logoUrl}" alt="Wanago" width="140" style="display:inline-block;background:#fff;padding:10px 16px;border-radius:10px;" />
      </div>
      <div style="padding:32px 28px;">
        <p style="font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#16a34a;margin:0 0 12px;">Welcome to Team Wanago</p>
        <h1 style="font-size:22px;margin:0 0 16px;color:#111;">Hi ${fullName}! 👋</h1>
        <p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 16px;">
          We're thrilled to welcome you to <strong>Wanago Travel &amp; Co</strong> as our new <strong>${designation}</strong>.
          Your journey with us starts now, and we can't wait to see the places we'll go together.
        </p>
        <div style="border-left:3px solid #16a34a;background:#f0fdf4;padding:14px 18px;border-radius:0 10px 10px 0;margin:20px 0;">
          <p style="font-size:14px;color:#166534;font-style:italic;line-height:1.6;margin:0;">"${quote.text}"</p>
          <p style="font-size:12px;color:#16a34a;margin:8px 0 0;font-weight:600;">— ${quote.author}</p>
        </div>
        <p style="font-size:14px;color:#444;line-height:1.7;margin:16px 0 24px;">
          Log in to Wanago ERP to explore your dashboard, meet the team, and get started.
        </p>
        <a href="${appUrl()}/dashboard" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">Go to Wanago ERP</a>
      </div>
      <div style="background:#fafafa;padding:16px 28px;text-align:center;border-top:1px solid #eee;">
        <p style="font-size:11px;color:#999;margin:0;">Team Wanago · Wanago Travel &amp; Co</p>
      </div>
    </div>
  </div>`;
}

// Shared low-level sender — every email (generic notification or a named
// template like the welcome email) funnels through this one Resend call.
async function sendRawEmail(params: { to: string; subject: string; html: string }): Promise<{ ok: boolean; error?: string }> {
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
      html: params.html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Failed to send email: ${text}` };
  }
  return { ok: true };
}

// Server-side email send — the actual Resend call, shared by the
// client-facing /api/notify/email route and anything running purely
// server-side (like the daily reminders cron) that can't hit its own
// relative API routes.
export async function sendEmail(params: {
  to: string; subject: string; body: string; link?: string;
}): Promise<{ ok: boolean; error?: string }> {
  return sendRawEmail({ to: params.to, subject: params.subject, html: renderEmailHtml(params.subject, params.body, params.link) });
}

// Premium "Welcome to Team Wanago" email — sent once per new hire
// (createEmployee) and on-demand for the whole existing team via the
// Employees page's "Send Welcome Email to All" button.
export async function sendWelcomeEmail(params: {
  to: string; fullName: string; designation: string;
}): Promise<{ ok: boolean; error?: string }> {
  return sendRawEmail({
    to: params.to,
    subject: `Welcome to Team Wanago, ${params.fullName}! ✈️`,
    html: renderWelcomeEmailHtml(params.fullName, params.designation),
  });
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
