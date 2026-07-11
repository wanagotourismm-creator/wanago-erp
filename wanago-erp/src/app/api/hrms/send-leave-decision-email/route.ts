import { NextRequest, NextResponse } from "next/server";
import { sendLeaveDecisionEmail } from "@/lib/server/notify-server";
import { requireAuth } from "@/lib/firebase/admin";
import { isRateLimited } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// Client-callable wrapper — useEss.ts's decideInboxItem() runs in the
// browser and can't import notify-server.ts directly (Node-only
// firebase-admin). Fired alongside the existing in-app decision
// notification, same pattern as /api/hrms/send-welcome-email.
// Any authenticated user, not HR/Admin-only — a leave decision is made by
// whichever manager the request is routed to (any department), not
// necessarily HR.
export async function POST(req: NextRequest) {
  const caller = await requireAuth(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  if (isRateLimited(`send-leave-decision-email:${caller.uid}`, 60_000, 30)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute and try again." }, { status: 429 });
  }

  let payload: {
    to?: string; fullName?: string; leaveType?: string;
    fromDate?: string; toDate?: string; decision?: "approve" | "reject";
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!payload.to || !payload.fullName || !payload.leaveType || !payload.fromDate || !payload.toDate || !payload.decision) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const result = await sendLeaveDecisionEmail({
    to: payload.to, fullName: payload.fullName, leaveType: payload.leaveType,
    fromDate: payload.fromDate, toDate: payload.toDate, decision: payload.decision,
  });
  if (!result.ok) {
    const status = result.error?.startsWith("Email isn't set up") ? 501 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
