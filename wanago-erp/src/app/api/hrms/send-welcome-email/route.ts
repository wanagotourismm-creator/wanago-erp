import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/server/notify-server";

export const runtime = "nodejs";

// Client-callable wrapper around sendWelcomeEmail() — employee.service.ts
// and EmployeesPage.tsx both run in the browser and can't import
// notify-server.ts directly (it pulls in firebase-admin, a Node-only
// package), so they hit this route instead, same as how notify.ts's
// notifyUser() calls /api/notify/email rather than importing server code.
export async function POST(req: NextRequest) {
  let payload: { to?: string; fullName?: string; designation?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!payload.to || !payload.fullName || !payload.designation) {
    return NextResponse.json({ error: "Missing to/fullName/designation" }, { status: 400 });
  }

  const result = await sendWelcomeEmail({ to: payload.to, fullName: payload.fullName, designation: payload.designation });
  if (!result.ok) {
    const status = result.error?.startsWith("Email isn't set up") ? 501 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
