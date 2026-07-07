import { FieldValue } from "firebase-admin/firestore";
import nodemailer from "nodemailer";
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
  // Full-bleed table layout (100% width, no outer margin/background) so the
  // email fills the client's viewport edge-to-edge instead of floating as a
  // small card inside visible gray/white margins.
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;width:100%;background:#ffffff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:40px 24px;text-align:center;">
          <img src="${logoUrl}" alt="Wanago" width="150" style="display:inline-block;background:#fff;padding:12px 18px;border-radius:10px;" />
        </td>
      </tr>
      <tr>
        <td style="padding:36px 32px;background:#ffffff;">
          <p style="font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#16a34a;margin:0 0 12px;">Welcome to Team Wanago</p>
          <h1 style="font-size:24px;margin:0 0 16px;color:#111;">Hi ${fullName}! 👋</h1>
          <p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 20px;">
            We're thrilled to welcome you to <strong>Wanago Travel &amp; Co</strong> as our new <strong>${designation}</strong>.
            Your journey with us starts now, and we can't wait to see the places we'll go together.
          </p>
          <div style="border-left:3px solid #16a34a;background:#f0fdf4;padding:16px 20px;border-radius:0 10px 10px 0;margin:0 0 24px;">
            <p style="font-size:14px;color:#166534;font-style:italic;line-height:1.6;margin:0;">"${quote.text}"</p>
            <p style="font-size:12px;color:#16a34a;margin:8px 0 0;font-weight:600;">— ${quote.author}</p>
          </div>
          <p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 28px;">
            Log in to Wanago ERP to explore your dashboard, meet the team, and get started.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#16a34a;">
            <a href="${appUrl()}/dashboard" style="display:inline-block;color:#fff;text-decoration:none;padding:13px 32px;font-size:14px;font-weight:600;">Go to Wanago ERP</a>
          </td></tr></table>
          <p style="font-size:14px;color:#333;line-height:1.6;margin:32px 0 0;">Thanks,<br/><strong>Team Wanago</strong> — welcoming you aboard! ✈️</p>
        </td>
      </tr>
      <tr>
        <td style="background:#166534;padding:18px 32px;text-align:center;">
          <p style="font-size:11px;color:#dcfce7;margin:0;">Team Wanago · Wanago Travel &amp; Co</p>
        </td>
      </tr>
    </table>
  </div>`;
}

// Gmail SMTP is authenticated as the real Gmail account (via an app
// password), so it can actually send to any real recipient with no domain
// verification needed — unlike Resend's default sender, which is a
// sandbox that can only email the account owner. Preferred whenever it's
// configured; Resend is the fallback for when it isn't.
let gmailTransport: ReturnType<typeof nodemailer.createTransport> | null = null;
let gmailTransportUser: string | null = null;

async function sendViaGmail(params: { to: string; subject: string; html: string }): Promise<{ ok: boolean; error?: string } | null> {
  const user = await getIntegrationSecret("gmailUser", "GMAIL_USER");
  const pass = await getIntegrationSecret("gmailAppPassword", "GMAIL_APP_PASSWORD");
  if (!user || !pass) return null; // not configured — caller falls back to Resend

  if (!gmailTransport || gmailTransportUser !== user) {
    gmailTransport = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
    gmailTransportUser = user;
  }

  try {
    await gmailTransport.sendMail({
      from: `Wanago Travel & Co <${user}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send via Gmail" };
  }
}

async function sendViaResend(params: { to: string; subject: string; html: string }): Promise<{ ok: boolean; error?: string }> {
  const apiKey = await getIntegrationSecret("resendApiKey", "RESEND_API_KEY");
  if (!apiKey) {
    return { ok: false, error: "Email isn't set up yet — configure Gmail SMTP or a Resend API key in Admin → Integrations." };
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

// Shared low-level sender — every email (generic notification or a named
// template like the welcome email) funnels through here. Tries Gmail SMTP
// first (if configured), falls back to Resend.
async function sendRawEmail(params: { to: string; subject: string; html: string }): Promise<{ ok: boolean; error?: string }> {
  const viaGmail = await sendViaGmail(params);
  if (viaGmail) return viaGmail;
  return sendViaResend(params);
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
