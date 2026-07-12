import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Sentiment, TeamPulseAggregate } from "@/modules/team-pulse/types";

export const runtime = "nodejs";

// Reads every individual response for the round via the Admin SDK, but
// returns ONLY the aggregate — no uid, no comment, no per-response data
// ever leaves this route. This is what keeps the feature "anonymous to
// viewers" even though the underlying documents carry a submitter uid.
export async function GET(req: NextRequest) {
  const roundId = req.nextUrl.searchParams.get("roundId");
  if (!roundId) {
    return NextResponse.json({ error: "roundId is required" }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 500 });
  }

  const snap = await db.collection(FIRESTORE_COLLECTIONS.TEAM_PULSE_RESPONSES)
    .where("roundId", "==", roundId)
    .get();

  const distribution: Record<Sentiment, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  let count = 0;

  for (const doc of snap.docs) {
    const sentiment = doc.data().sentiment as Sentiment;
    if (sentiment >= 1 && sentiment <= 5) {
      distribution[sentiment] += 1;
      sum += sentiment;
      count += 1;
    }
  }

  const result: TeamPulseAggregate = {
    roundId,
    totalResponses: count,
    averageSentiment: count > 0 ? Math.round((sum / count) * 10) / 10 : null,
    distribution,
  };

  return NextResponse.json(result);
}
