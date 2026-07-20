import { NextRequest, NextResponse } from "next/server";
import { scanTimeBasedTriggers, advanceDueRuns, updateAnalytics } from "@/modules/journeys/services/journey-engine.server";

export const runtime = "nodejs";

// Verified daily by Vercel Cron (see vercel.json) — same bearer-secret +
// Admin SDK pattern as daily-reminders/review-requests. Runs the three
// journey-engine passes in sequence: pick up any newly-due time-based
// triggers, advance every in-progress run whose current step is due, then
// roll reply/conversion proxies into the per-journey analytics counters.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const { created } = await scanTimeBasedTriggers(now);
  const { advanced } = await advanceDueRuns(now);
  const { updated } = await updateAnalytics();

  return NextResponse.json({ ok: true, created, advanced, analyticsUpdated: updated });
}
