import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function renderEmailHtml(subject: string, body: string, link?: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wanago-erp.vercel.app";
  const cta = link
    ? `<a href="${appUrl}${link}" style="display:inline-block;margin-top:20px;background:#16a34a;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600;">Open My HR</a>`
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

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Email isn't set up yet — add RESEND_API_KEY to the deployment." }, { status: 501 });
  }

  let payload: { to?: string; subject?: string; body?: string; link?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!payload.to || !payload.subject || !payload.body) {
    return NextResponse.json({ error: "Missing to/subject/body" }, { status: 400 });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Wanago HR <onboarding@resend.dev>",
      to: payload.to,
      subject: payload.subject,
      html: renderEmailHtml(payload.subject, payload.body, payload.link),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Failed to send email: ${text}` }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
