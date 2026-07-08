import { NextRequest, NextResponse } from "next/server";
import { sendCertificateEmail } from "@/lib/server/notify-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let payload: { to?: string; employeeName?: string; moduleTitle?: string; certificateId?: string; pdfUrl?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { to, employeeName, moduleTitle, certificateId, pdfUrl } = payload;
  if (!to || !employeeName || !moduleTitle || !certificateId || !pdfUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const result = await sendCertificateEmail({ to, employeeName, moduleTitle, certificateId, pdfUrl });
  if (!result.ok) {
    const status = result.error?.startsWith("Email isn't set up") ? 501 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
