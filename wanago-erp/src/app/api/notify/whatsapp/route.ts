import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/firebase/admin";
import { isRateLimited } from "@/lib/server/rate-limit";
import { sendWhatsAppMessage } from "@/lib/whatsapp/meta-client";
import { sendWhatsAppSmart } from "@/lib/whatsapp/template-router";

export const runtime = "nodejs";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
}

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export async function POST(req: NextRequest) {
  const caller = await requireAuth(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  if (isRateLimited(`notify-whatsapp:${caller.uid}`, 60_000, 30)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let payload: { to?: string; body?: string; purpose?: string; variables?: string[] };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!payload.to || !payload.body) {
    return NextResponse.json({ error: "Missing to/body" }, { status: 400 });
  }

  const to = normalizePhone(payload.to);
  const body = payload.body.slice(0, 1500);
  const result = payload.purpose
    ? await sendWhatsAppSmart({ to, purpose: payload.purpose, variables: payload.variables ?? [], fallbackBody: body })
    : await sendWhatsAppMessage(to, body);
  if (!result.ok) {
    const status = result.error.startsWith("WhatsApp isn't set up") ? 501 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
