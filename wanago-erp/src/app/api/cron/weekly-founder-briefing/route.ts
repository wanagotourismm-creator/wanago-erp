import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { computeFounderBriefing } from "@/modules/digests/services/founder-briefing.service";

export const runtime = "nodejs";

// Same bearer-token + Monday-morning pattern as /api/cron/weekly-sales-digest
// — runs shortly after it (5am vs 4am UTC in vercel.json) though there's no
// actual dependency between them; each recomputes its own numbers directly
// from bookings/leads.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 500 });
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const thisWeekMonday = new Date(now);
  thisWeekMonday.setHours(0, 0, 0, 0);
  thisWeekMonday.setDate(thisWeekMonday.getDate() - daysSinceMonday);

  const weekEnd   = thisWeekMonday;
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 7);

  const briefing = await computeFounderBriefing(weekStart, weekEnd);

  const weekOf = weekStart.toISOString().slice(0, 10);
  const docId = `founder-briefing_${weekOf}`;

  await db.collection(FIRESTORE_COLLECTIONS.DIGESTS).doc(docId).set({
    type: "founder-briefing",
    weekOf,
    ...briefing,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "system",
    status: "generated",
  });

  return NextResponse.json({ weekOf, totalRevenue: briefing.totalRevenue, totalBookings: briefing.totalBookings });
}
