import { NextRequest, NextResponse } from "next/server";
import { runWeeklyAiInsights } from "@/modules/digests/services/ai-insights.service";

export const runtime = "nodejs";

// Same bearer-token + Monday-morning pattern as /api/cron/weekly-sales-digest
// and /api/cron/weekly-founder-briefing — runs an hour after the founder
// briefing (6am vs 5am UTC in vercel.json), no dependency between them.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { weekOf, result } = await runWeeklyAiInsights();
    return NextResponse.json({ weekOf, totalRevenue: result.totalRevenue, headline: result.headline });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to generate insights" }, { status: 500 });
  }
}
