import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/firebase/admin";
import { applyApprovedFix, rejectFix } from "@/modules/tickets/services/ai-bugfix.service";

export const runtime = "nodejs";
export const maxDuration = 60;

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// The one place a human turns an AI-proposed fix (ticket.aiProposedFix,
// written by diagnoseFix in ai-bugfix.service.ts) into an actual GitHub
// commit/PR, or dismisses it. Admin-only — this is a real write credential
// to the app's own repo, not just an ERP data write.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireAdmin(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const decision = body?.decision;
  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json({ error: "decision must be 'approve' or 'reject'." }, { status: 400 });
  }

  try {
    const result = decision === "approve"
      ? await applyApprovedFix(id, caller.uid)
      : await rejectFix(id, caller.uid);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Review action failed." }, { status: 500 });
  }
}
