import { NextRequest, NextResponse } from "next/server";
import { sendQuotationEmail } from "@/lib/server/notify-server";
import { requireAuth } from "@/lib/firebase/admin";
import { isRateLimited } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export async function POST(req: NextRequest) {
  const caller = await requireAuth(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  if (isRateLimited(`quotation-send-email:${caller.uid}`, 60_000, 30)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let payload: { to?: string; customerName?: string; refNumber?: string; grandTotal?: number; pdfUrl?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { to, customerName, refNumber, grandTotal, pdfUrl } = payload;
  if (!to || !customerName || !refNumber || grandTotal == null || !pdfUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const result = await sendQuotationEmail({ to, customerName, refNumber, grandTotal, pdfUrl });
  if (!result.ok) {
    const status = result.error?.startsWith("Email isn't set up") ? 501 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
