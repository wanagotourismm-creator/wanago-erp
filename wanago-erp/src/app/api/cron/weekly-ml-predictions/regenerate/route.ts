import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/firebase/admin";
import { runWeeklyMlPredictions } from "@/modules/predictions/services/ml-predictions.service";

export const runtime = "nodejs";

// Lets an admin regenerate this week's ML predictions on demand, same
// pattern as /api/cron/weekly-ai-insights/regenerate.
export async function POST(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const caller = await requireAdmin(idToken);
  if (!caller) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const result = await runWeeklyMlPredictions();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ weekOf: result.weekOf, revenueForecast: result.revenueForecast, leadConversion: result.leadConversion });
}
