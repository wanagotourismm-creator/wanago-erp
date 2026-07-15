import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/firebase/admin";
import { runWeeklyAiInsights } from "@/modules/digests/services/ai-insights.service";

export const runtime = "nodejs";

// Lets an admin regenerate this week's AI Insights report on demand
// (instead of waiting for the Monday cron), e.g. right after fixing bad
// data or just to see current numbers mid-week. Overwrites the same
// per-week `digests` doc the cron writes, via the same
// runWeeklyAiInsights() — no separate code path to drift out of sync.
export async function POST(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const caller = await requireAdmin(idToken);
  if (!caller) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  try {
    const { weekOf, result } = await runWeeklyAiInsights();
    return NextResponse.json({ weekOf, totalRevenue: result.totalRevenue, headline: result.headline });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to generate insights" }, { status: 500 });
  }
}
