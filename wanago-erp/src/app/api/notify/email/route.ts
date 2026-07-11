import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/server/notify-server";
import { requireAuth } from "@/lib/firebase/admin";
import { isRateLimited } from "@/lib/server/rate-limit";
import type { NotificationCategory } from "@/modules/notifications/types";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export async function POST(req: NextRequest) {
  const caller = await requireAuth(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  if (isRateLimited(`notify-email:${caller.uid}`, 60_000, 30)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let payload: { to?: string; subject?: string; body?: string; link?: string; category?: NotificationCategory };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!payload.to || !payload.subject || !payload.body) {
    return NextResponse.json({ error: "Missing to/subject/body" }, { status: 400 });
  }

  const result = await sendEmail({ to: payload.to, subject: payload.subject, body: payload.body, link: payload.link, category: payload.category });
  if (!result.ok) {
    const status = result.error?.startsWith("Email isn't set up") ? 501 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
