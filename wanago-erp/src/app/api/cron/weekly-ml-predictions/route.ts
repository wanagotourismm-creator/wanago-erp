import { NextRequest, NextResponse } from "next/server";
import { runWeeklyMlPredictions } from "@/modules/predictions/services/ml-predictions.service";

export const runtime = "nodejs";

// Same bearer-token + Monday-morning pattern as the other weekly crons —
// runs an hour after weekly-ai-insights (7am vs 6am UTC in vercel.json).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runWeeklyMlPredictions();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ weekOf: result.weekOf, revenueForecast: result.revenueForecast, leadConversion: result.leadConversion });
}
