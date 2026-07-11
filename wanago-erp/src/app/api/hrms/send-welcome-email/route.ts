import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/server/notify-server";
import { requireHrOrAdmin } from "@/lib/firebase/admin";
import { isRateLimited } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// Client-callable wrapper around sendWelcomeEmail() — employee.service.ts
// and EmployeesPage.tsx both run in the browser and can't import
// notify-server.ts directly (it pulls in firebase-admin, a Node-only
// package), so they hit this route instead, same as how notify.ts's
// notifyUser() calls /api/notify/email rather than importing server code.
// Gated to HR/Admin — same role boundary as the Employees page itself,
// and this is only ever triggered from that page's onboarding flow.
export async function POST(req: NextRequest) {
  const caller = await requireHrOrAdmin(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  // Generous cap — EmployeesPage.tsx's "send to all" bulk action legitimately
  // fires one request per employee in a loop, so this must comfortably clear
  // a normal-sized team, not just single sends.
  if (isRateLimited(`send-welcome-email:${caller.uid}`, 60_000, 60)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

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
