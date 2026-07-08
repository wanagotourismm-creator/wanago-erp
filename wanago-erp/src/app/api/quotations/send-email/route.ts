import { NextRequest, NextResponse } from "next/server";
import { sendQuotationEmail } from "@/lib/server/notify-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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
