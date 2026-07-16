import { FieldValue } from "firebase-admin/firestore";
import nodemailer from "nodemailer";
import { getAdminDb } from "@/lib/firebase/admin";
import { getIntegrationSecret } from "@/lib/get-integration-secret";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { getAppUrl } from "@/lib/app-url";
import { getCompanySettingsServer } from "@/modules/admin/settings/services/company-settings.server";
import { sendWhatsAppMessage } from "@/lib/whatsapp/meta-client";
import { sendWhatsAppSmart } from "@/lib/whatsapp/template-router";
import type { NotificationCategory } from "@/modules/notifications/types";

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

// Shown on rest/recovery-themed emails (a sick leave approval) instead of
// the travel quotes — a "go have an adventure" line reads oddly when
// someone's actually unwell.
const REST_QUOTES: { text: string; author: string }[] = [
  { text: "Take rest; a field that has rested gives a bountiful crop.", author: "Ovid" },
  { text: "Health is the greatest gift, contentment the greatest wealth.", author: "Buddha" },
  { text: "Rest and self-care are so important. When you take time to replenish your spirit, it allows you to serve others from the overflow.", author: "Eleanor Brown" },
  { text: "Taking care of yourself doesn't mean me first, it means me too.", author: "L.R. Knost" },
  { text: "Sometimes the most productive thing you can do is rest.", author: "Anonymous" },
  { text: "The greatest wealth is health.", author: "Virgil" },
];

// The general-purpose pool used by the everyday notification template
// (asset requests, attendance corrections, approvals, reminders) — team/
// work themed rather than travel themed, so it fits any kind of update.
const GENERAL_QUOTES: { text: string; author: string }[] = [
  { text: "Great things in business are never done by one person. They're done by a team of people.", author: "Steve Jobs" },
  { text: "Alone we can do so little; together we can do so much.", author: "Helen Keller" },
  { text: "The strength of the team is each individual member.", author: "Phil Jackson" },
  { text: "Coming together is a beginning, staying together is progress, working together is success.", author: "Henry Ford" },
  { text: "Teamwork makes the dream work.", author: "John C. Maxwell" },
  { text: "It is amazing what you can accomplish if you do not care who gets the credit.", author: "Harry S. Truman" },
  { text: "Individually, we are one drop. Together, we are an ocean.", author: "Ryunosuke Satoro" },
  { text: "Success is best when it's shared.", author: "Howard Schultz" },
];

const CATEGORY_META: Record<NotificationCategory, { icon: string; label: string | null }> = {
  leave:          { icon: "🌴", label: "Leave" },
  regularization: { icon: "🕒", label: "Attendance" },
  asset:          { icon: "💻", label: "Asset Request" },
  ticket:         { icon: "🎫", label: "Support Ticket" },
  system:         { icon: "🎉", label: null },
  followup:       { icon: "⏰", label: "Reminder" },
  approval:       { icon: "📄", label: "Approval" },
  location:       { icon: "📍", label: "Location Approval" },
};

// Full-bleed, brand-colored card used for every generic notification email
// (asset/leave/regularization requests, Finance/Operations approvals,
// reminders) — same premium look as the welcome email instead of a bare
// paragraph of text. Tone (green vs. red header) is inferred from the
// subject line, since every caller already writes "...approved"/
// "...rejected" into it.
function renderEmailHtml(subject: string, body: string, businessName: string, link?: string, category?: NotificationCategory) {
  const lower = subject.toLowerCase();
  const isApproved = lower.includes("approved") || lower.includes("confirmed");
  const isRejected = lower.includes("rejected");
  const headerGradient = isRejected ? "linear-gradient(135deg,#dc2626,#b91c1c)" : "linear-gradient(135deg,#16a34a,#15803d)";
  const meta = category ? CATEGORY_META[category] : undefined;
  const headerLabel = meta?.label ?? businessName;
  const headline = isApproved ? "✅" : isRejected ? "📋" : (meta?.icon ?? "📣");
  const quote = GENERAL_QUOTES[Math.floor(Math.random() * GENERAL_QUOTES.length)];
  const logoUrl = `${getAppUrl()}/images/logo-dark-clean.png`;

  const cta = link
    ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#16a34a;">
        <a href="${getAppUrl()}${link}" style="display:inline-block;color:#fff;text-decoration:none;padding:13px 32px;font-size:14px;font-weight:600;">Open ${businessName} ERP</a>
      </td></tr></table>`
    : "";

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;width:100%;background:#ffffff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="background:${headerGradient};padding:36px 24px;text-align:center;">
          <img src="${logoUrl}" alt="${businessName}" width="130" style="display:inline-block;background:#fff;padding:10px 16px;border-radius:10px;margin-bottom:14px;" />
          <p style="font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#ffffff;margin:0;opacity:0.95;">${headerLabel}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 32px;background:#ffffff;">
          <p style="font-size:32px;margin:0 0 12px;line-height:1;">${headline}</p>
          <h1 style="font-size:22px;margin:0 0 16px;color:#111;">${subject}</h1>
          <p style="font-size:15px;color:#444;line-height:1.7;white-space:pre-wrap;margin:0 0 24px;">${body}</p>
          <div style="border-left:3px solid #16a34a;background:#f0fdf4;padding:16px 20px;border-radius:0 10px 10px 0;margin:0 0 28px;">
            <p style="font-size:14px;color:#166534;font-style:italic;line-height:1.6;margin:0;">"${quote.text}"</p>
            <p style="font-size:12px;color:#16a34a;margin:8px 0 0;font-weight:600;">— ${quote.author}</p>
          </div>
          ${cta}
          <p style="font-size:14px;color:#333;line-height:1.6;margin:32px 0 0;">Thanks,<br/><strong>Team ${businessName}</strong></p>
        </td>
      </tr>
      <tr>
        <td style="background:#166534;padding:18px 32px;text-align:center;">
          <p style="font-size:11px;color:#dcfce7;margin:0;">Team ${businessName}</p>
        </td>
      </tr>
    </table>
  </div>`;
}

function renderWelcomeEmailHtml(fullName: string, designation: string, businessName: string) {
  const quote = TRAVEL_QUOTES[Math.floor(Math.random() * TRAVEL_QUOTES.length)];
  const logoUrl = `${getAppUrl()}/images/logo-dark-clean.png`;
  // Full-bleed table layout (100% width, no outer margin/background) so the
  // email fills the client's viewport edge-to-edge instead of floating as a
  // small card inside visible gray/white margins.
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;width:100%;background:#ffffff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:40px 24px;text-align:center;">
          <img src="${logoUrl}" alt="${businessName}" width="150" style="display:inline-block;background:#fff;padding:12px 18px;border-radius:10px;" />
        </td>
      </tr>
      <tr>
        <td style="padding:36px 32px;background:#ffffff;">
          <p style="font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#16a34a;margin:0 0 12px;">Welcome to Team ${businessName}</p>
          <h1 style="font-size:24px;margin:0 0 16px;color:#111;">Hi ${fullName}! 👋</h1>
          <p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 20px;">
            We're thrilled to welcome you to <strong>${businessName}</strong> as our new <strong>${designation}</strong>.
            Your journey with us starts now, and we can't wait to see the places we'll go together.
          </p>
          <div style="border-left:3px solid #16a34a;background:#f0fdf4;padding:16px 20px;border-radius:0 10px 10px 0;margin:0 0 24px;">
            <p style="font-size:14px;color:#166534;font-style:italic;line-height:1.6;margin:0;">"${quote.text}"</p>
            <p style="font-size:12px;color:#16a34a;margin:8px 0 0;font-weight:600;">— ${quote.author}</p>
          </div>
          <p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 28px;">
            Log in to ${businessName} ERP to explore your dashboard, meet the team, and get started.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#16a34a;">
            <a href="${getAppUrl()}/dashboard" style="display:inline-block;color:#fff;text-decoration:none;padding:13px 32px;font-size:14px;font-weight:600;">Go to ${businessName} ERP</a>
          </td></tr></table>
          <p style="font-size:14px;color:#333;line-height:1.6;margin:32px 0 0;">Thanks,<br/><strong>Team ${businessName}</strong> — welcoming you aboard! ✈️</p>
        </td>
      </tr>
      <tr>
        <td style="background:#166534;padding:18px 32px;text-align:center;">
          <p style="font-size:11px;color:#dcfce7;margin:0;">Team ${businessName}</p>
        </td>
      </tr>
    </table>
  </div>`;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  casual: "Casual Leave", sick: "Sick Leave", earned: "Earned Leave", emergency: "Emergency Leave",
  wfh: "Work From Home", loss_of_pay: "Loss of Pay",
};

// A leave decision gets its own template rather than the generic one — the
// tone genuinely needs to differ: sick leave shouldn't say "enjoy your day,"
// and a rejection shouldn't carry a celebratory quote at all.
function renderLeaveDecisionEmailHtml(params: {
  fullName: string; leaveType: string; fromDate: string; toDate: string; decision: "approve" | "reject"; businessName: string;
}) {
  const { fullName, leaveType, fromDate, toDate, decision, businessName } = params;
  const typeLabel = LEAVE_TYPE_LABELS[leaveType] ?? leaveType;
  const dateRange = fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`;
  const isSick = leaveType === "sick";
  const approved = decision === "approve";
  const logoUrl = `${getAppUrl()}/images/logo-dark-clean.png`;

  const headerGradient = approved ? "linear-gradient(135deg,#16a34a,#15803d)" : "linear-gradient(135deg,#dc2626,#b91c1c)";
  const icon = approved ? (isSick ? "🤍" : "🌴") : "📋";
  const heading = approved ? `Your ${typeLabel} is approved!` : `About your ${typeLabel} request`;

  let message: string;
  let quote: { text: string; author: string };
  if (approved && isSick) {
    message = `Your sick leave from <strong>${dateRange}</strong> has been approved. Take care of yourself, get plenty of rest, and we hope you feel better very soon.`;
    quote = REST_QUOTES[Math.floor(Math.random() * REST_QUOTES.length)];
  } else if (approved) {
    message = `Your ${typeLabel.toLowerCase()} from <strong>${dateRange}</strong> has been approved. Enjoy your day — you've earned it!`;
    quote = TRAVEL_QUOTES[Math.floor(Math.random() * TRAVEL_QUOTES.length)];
  } else {
    message = `Your ${typeLabel.toLowerCase()} request for <strong>${dateRange}</strong> couldn't be approved this time. Reach out to your reporting manager if you'd like to discuss it or pick different dates.`;
    quote = GENERAL_QUOTES[Math.floor(Math.random() * GENERAL_QUOTES.length)];
  }

  const accent = approved ? { border: "#16a34a", bg: "#f0fdf4", text: "#166534", author: "#16a34a" }
                           : { border: "#dc2626", bg: "#fef2f2", text: "#991b1b", author: "#b91c1c" };

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;width:100%;background:#ffffff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="background:${headerGradient};padding:36px 24px;text-align:center;">
          <img src="${logoUrl}" alt="${businessName}" width="130" style="display:inline-block;background:#fff;padding:10px 16px;border-radius:10px;" />
        </td>
      </tr>
      <tr>
        <td style="padding:36px 32px;background:#ffffff;">
          <p style="font-size:32px;margin:0 0 12px;line-height:1;">${icon}</p>
          <h1 style="font-size:22px;margin:0 0 16px;color:#111;">Hi ${fullName}, ${heading}</h1>
          <p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 24px;">${message}</p>
          <div style="border-left:3px solid ${accent.border};background:${accent.bg};padding:16px 20px;border-radius:0 10px 10px 0;margin:0 0 28px;">
            <p style="font-size:14px;color:${accent.text};font-style:italic;line-height:1.6;margin:0;">"${quote.text}"</p>
            <p style="font-size:12px;color:${accent.author};margin:8px 0 0;font-weight:600;">— ${quote.author}</p>
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#16a34a;">
            <a href="${getAppUrl()}/ess" style="display:inline-block;color:#fff;text-decoration:none;padding:13px 32px;font-size:14px;font-weight:600;">View in ${businessName} ERP</a>
          </td></tr></table>
          <p style="font-size:14px;color:#333;line-height:1.6;margin:32px 0 0;">Thanks,<br/><strong>Team ${businessName}</strong></p>
        </td>
      </tr>
      <tr>
        <td style="background:#166534;padding:18px 32px;text-align:center;">
          <p style="font-size:11px;color:#dcfce7;margin:0;">Team ${businessName}</p>
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

type EmailAttachment = { filename: string; url: string };

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("base64");
}

async function sendViaGmail(params: { to: string; subject: string; html: string; businessName: string; attachments?: EmailAttachment[] }): Promise<{ ok: boolean; error?: string } | null> {
  const user = await getIntegrationSecret("gmailUser", "GMAIL_USER");
  const pass = await getIntegrationSecret("gmailAppPassword", "GMAIL_APP_PASSWORD");
  if (!user || !pass) return null; // not configured — caller falls back to Resend

  if (!gmailTransport || gmailTransportUser !== user) {
    gmailTransport = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
    gmailTransportUser = user;
  }

  try {
    await gmailTransport.sendMail({
      from: `${params.businessName} <${user}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      // nodemailer fetches straight from the Storage URL — no need to
      // download/re-encode the file ourselves.
      attachments: params.attachments?.map((a) => ({ filename: a.filename, path: a.url })),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send via Gmail" };
  }
}

async function sendViaResend(params: { to: string; subject: string; html: string; businessName: string; attachments?: EmailAttachment[] }): Promise<{ ok: boolean; error?: string }> {
  const apiKey = await getIntegrationSecret("resendApiKey", "RESEND_API_KEY");
  if (!apiKey) {
    return { ok: false, error: "Email isn't set up yet — configure Gmail SMTP or a Resend API key in Admin → Integrations." };
  }

  const fromEmail = await getIntegrationSecret("resendFromEmail", "RESEND_FROM_EMAIL");
  // Resend's API wants attachment content inline as base64, unlike Gmail
  // which can just stream from the URL — fetch and encode here instead.
  const attachments = params.attachments
    ? await Promise.all(params.attachments.map(async (a) => ({ filename: a.filename, content: await urlToBase64(a.url) })))
    : undefined;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: fromEmail || `${params.businessName} <onboarding@resend.dev>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments,
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
async function sendRawEmail(params: { to: string; subject: string; html: string; businessName: string; attachments?: EmailAttachment[] }): Promise<{ ok: boolean; error?: string }> {
  const viaGmail = await sendViaGmail(params);
  if (viaGmail) return viaGmail;
  return sendViaResend(params);
}

// Server-side email send — the actual Resend call, shared by the
// client-facing /api/notify/email route and anything running purely
// server-side (like the daily reminders cron) that can't hit its own
// relative API routes.
export async function sendEmail(params: {
  to: string; subject: string; body: string; link?: string; category?: NotificationCategory;
}): Promise<{ ok: boolean; error?: string }> {
  const company = await getCompanySettingsServer();
  return sendRawEmail({
    to: params.to,
    subject: params.subject,
    html: renderEmailHtml(params.subject, params.body, company.businessName, params.link, params.category),
    businessName: company.businessName,
  });
}

// Premium "Welcome to Team {Company}" email — sent once per new hire
// (createEmployee) and on-demand for the whole existing team via the
// Employees page's "Send Welcome Email to All" button.
export async function sendWelcomeEmail(params: {
  to: string; fullName: string; designation: string;
}): Promise<{ ok: boolean; error?: string }> {
  const company = await getCompanySettingsServer();
  return sendRawEmail({
    to: params.to,
    subject: `Welcome to Team ${company.businessName}, ${params.fullName}! ✈️`,
    html: renderWelcomeEmailHtml(params.fullName, params.designation, company.businessName),
    businessName: company.businessName,
  });
}

function renderCertificateEmailHtml(employeeName: string, moduleTitle: string, certificateId: string, businessName: string) {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;width:100%;background:#ffffff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:40px 24px;text-align:center;">
          <p style="font-size:40px;margin:0 0 8px;">🎓</p>
          <p style="font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#ffffff;margin:0;opacity:0.95;">Certificate of Completion</p>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 32px;background:#ffffff;">
          <h1 style="font-size:22px;margin:0 0 16px;color:#111;">Congratulations, ${employeeName}! 🎉</h1>
          <p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 20px;">
            You've completed the <strong>${moduleTitle}</strong> training module on ${businessName} ERP. Your certificate is attached to this email as a PDF — keep it for your records.
          </p>
          <p style="font-size:12px;color:#999;margin:0 0 24px;">Certificate ID: <strong>${certificateId}</strong></p>
          <p style="font-size:14px;color:#333;line-height:1.6;margin:0;">Thanks,<br/><strong>Team ${businessName}</strong></p>
        </td>
      </tr>
      <tr>
        <td style="background:#166534;padding:18px 32px;text-align:center;">
          <p style="font-size:11px;color:#dcfce7;margin:0;">Team ${businessName}</p>
        </td>
      </tr>
    </table>
  </div>`;
}

// Sent automatically when an employee finishes every step (and passes every
// quiz) in a training module — see useTrainingWalkthrough's completion
// handler. Best-effort: a failed email never blocks the completion itself,
// the certificate record and PDF already exist in Firestore/Storage either way.
export async function sendCertificateEmail(params: {
  to: string; employeeName: string; moduleTitle: string; certificateId: string; pdfUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const company = await getCompanySettingsServer();
  return sendRawEmail({
    to: params.to,
    subject: `Your Certificate: ${params.moduleTitle} ✈️`,
    html: renderCertificateEmailHtml(params.employeeName, params.moduleTitle, params.certificateId, company.businessName),
    businessName: company.businessName,
    attachments: [{ filename: `${params.certificateId}.pdf`, url: params.pdfUrl }],
  });
}

function renderQuotationEmailHtml(customerName: string, refNumber: string, grandTotal: number, businessName: string) {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;width:100%;background:#ffffff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:40px 24px;text-align:center;">
          <p style="font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#ffffff;margin:0;opacity:0.95;">Your Travel Quotation</p>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 32px;background:#ffffff;">
          <h1 style="font-size:22px;margin:0 0 16px;color:#111;">Hi ${customerName}! ✈️</h1>
          <p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 20px;">
            Thanks for your interest in traveling with us. Your quotation <strong>${refNumber}</strong> for <strong>₹${Math.round(grandTotal).toLocaleString("en-IN")}</strong> is attached to this email as a PDF — it includes the full breakdown, payment details, and terms.
          </p>
          <p style="font-size:14px;color:#333;line-height:1.6;margin:0;">Thanks,<br/><strong>Team ${businessName}</strong></p>
        </td>
      </tr>
      <tr>
        <td style="background:#166534;padding:18px 32px;text-align:center;">
          <p style="font-size:11px;color:#dcfce7;margin:0;">Team ${businessName}</p>
        </td>
      </tr>
    </table>
  </div>`;
}

// Sent automatically the moment a quotation is created, if the customer
// has an email on file — see createQuotation's best-effort completion
// handler. A failed send never blocks quotation creation; the quotation
// record already exists in Firestore either way.
export async function sendQuotationEmail(params: {
  to: string; customerName: string; refNumber: string; grandTotal: number; pdfUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const company = await getCompanySettingsServer();
  return sendRawEmail({
    to: params.to,
    subject: `Your Quotation ${params.refNumber} — ${company.businessName} ✈️`,
    html: renderQuotationEmailHtml(params.customerName, params.refNumber, params.grandTotal, company.businessName),
    businessName: company.businessName,
    attachments: [{ filename: `Quotation-${params.refNumber}.pdf`, url: params.pdfUrl }],
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
  phone?:   string | null;
  whatsappPurpose?:   string;
  whatsappVariables?: string[];
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
    tasks.push(sendEmail({ to: params.email, subject: params.title, body: params.body, link: params.link, category: params.category }).catch(() => {}));
  }
  if (params.phone) {
    const fallbackBody = `${params.title}\n${params.body}`;
    tasks.push(
      (params.whatsappPurpose
        ? sendWhatsAppSmart({ to: params.phone, purpose: params.whatsappPurpose, variables: params.whatsappVariables ?? [], fallbackBody })
        : sendWhatsAppMessage(params.phone, fallbackBody)
      ).catch(() => {})
    );
  }

  await Promise.allSettled(tasks);
}

// Leave decisions get their own mood-aware email (sick vs. every other
// leave type reads very differently) rather than the generic template.
// Sent alongside the in-app notification, not instead of it.
export async function sendLeaveDecisionEmail(params: {
  to: string; fullName: string; leaveType: string; fromDate: string; toDate: string; decision: "approve" | "reject";
}): Promise<{ ok: boolean; error?: string }> {
  const company = await getCompanySettingsServer();
  const typeLabel = LEAVE_TYPE_LABELS[params.leaveType] ?? params.leaveType;
  const subject = params.decision === "approve" ? `Your ${typeLabel} is approved ✅` : `Update on your ${typeLabel} request`;
  return sendRawEmail({
    to: params.to,
    subject,
    html: renderLeaveDecisionEmailHtml({ ...params, businessName: company.businessName }),
    businessName: company.businessName,
  });
}
