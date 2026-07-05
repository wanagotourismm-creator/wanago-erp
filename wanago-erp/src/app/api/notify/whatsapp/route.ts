import { NextRequest, NextResponse } from "next/server";
import { getIntegrationSecret } from "@/lib/get-integration-secret";

export const runtime = "nodejs";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export async function POST(req: NextRequest) {
  const [sid, token, from] = await Promise.all([
    getIntegrationSecret("twilioAccountSid", "TWILIO_ACCOUNT_SID"),
    getIntegrationSecret("twilioAuthToken", "TWILIO_AUTH_TOKEN"),
    getIntegrationSecret("twilioWhatsappNumber", "TWILIO_WHATSAPP_NUMBER"), // e.g. "+14155238886"
  ]);

  if (!sid || !token || !from) {
    return NextResponse.json(
      { error: "WhatsApp isn't set up yet — add your Twilio keys in Admin → Integrations." },
      { status: 501 }
    );
  }

  let payload: { to?: string; body?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!payload.to || !payload.body) {
    return NextResponse.json({ error: "Missing to/body" }, { status: 400 });
  }

  const to = normalizePhone(payload.to);
  const form = new URLSearchParams({
    From: `whatsapp:${from}`,
    To:   `whatsapp:${to}`,
    Body: payload.body.slice(0, 1500),
  });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Failed to send WhatsApp message: ${text}` }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
