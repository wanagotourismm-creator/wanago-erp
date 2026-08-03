import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { isAiAutoFixEnabled } from "@/modules/ai-core/services/ai-settings.server";
import { diagnoseAndDraftFix, countTodaysAiPrs, DAILY_AI_PR_CAP } from "@/modules/tickets/services/ai-bugfix.service";
import type { Ticket } from "@/modules/tickets/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// Called by the client right after creating a new ticket (fire-and-forget —
// see TicketsPanel.tsx / ReportIssueForm.tsx). Every eligibility check here
// is a real gate, not a formality: category, source, the master toggle, and
// the daily cap all have to pass before diagnoseAndDraftFix ever runs.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireAuth(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  if (!(await isAiAutoFixEnabled())) {
    return NextResponse.json({ status: "skipped", reason: "AI auto-fix is turned off." });
  }

  const { id } = await params;
  const db = getAdminDb();
  if (!db) return NextResponse.json({ status: "skipped", reason: "Server isn't configured for this yet." });

  const snap = await db.collection(FIRESTORE_COLLECTIONS.TICKETS).doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  const ticket = { id: snap.id, ...snap.data() } as Ticket;

  if (ticket.category !== "Software") {
    return NextResponse.json({ status: "skipped", reason: "Only Software-category tickets are eligible." });
  }
  // Customer-facing (NPS-detractor-sourced) tickets are free text from
  // outside the organization — a materially higher prompt-injection surface
  // than an internal staff-authored bug report, and are never eligible for
  // a code-modifying pipeline no matter how they're worded.
  if (ticket.sourceType === "nps_detractor") {
    return NextResponse.json({ status: "skipped", reason: "Customer-sourced tickets are never auto-diagnosed." });
  }

  const todaysCount = await countTodaysAiPrs();
  if (todaysCount >= DAILY_AI_PR_CAP) {
    return NextResponse.json({ status: "skipped", reason: `Daily AI auto-fix limit (${DAILY_AI_PR_CAP}) reached — try again tomorrow, or fix this one manually.` });
  }

  try {
    const result = await diagnoseAndDraftFix(ticket);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ status: "needs_human", reason: err instanceof Error ? err.message : "Diagnosis failed unexpectedly." });
  }
}
