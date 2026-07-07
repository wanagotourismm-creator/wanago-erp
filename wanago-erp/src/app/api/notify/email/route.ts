import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/server/notify-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let payload: { to?: string; subject?: string; body?: string; link?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!payload.to || !payload.subject || !payload.body) {
    return NextResponse.json({ error: "Missing to/subject/body" }, { status: 400 });
  }

  const result = await sendEmail({ to: payload.to, subject: payload.subject, body: payload.body, link: payload.link });
  if (!result.ok) {
    const status = result.error?.startsWith("Email isn't set up") ? 501 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
