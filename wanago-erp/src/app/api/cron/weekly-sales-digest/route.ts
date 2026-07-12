import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { computeWeeklySalesLeaderboard } from "@/modules/digests/services/weekly-sales-digest.service";

export const runtime = "nodejs";

// Verified by Vercel Cron (see vercel.json), same bearer-token pattern as
// /api/cron/daily-reminders — runs Monday morning and summarizes the week
// that just ended (previous Monday 00:00 -> this Monday 00:00), so agents
// see last week's full numbers rather than a partial in-progress week.
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
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const thisWeekMonday = new Date(now);
  thisWeekMonday.setHours(0, 0, 0, 0);
  thisWeekMonday.setDate(thisWeekMonday.getDate() - daysSinceMonday);

  const weekEnd   = thisWeekMonday;
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 7);

  const { rankings, totalRevenue, totalBookings } = await computeWeeklySalesLeaderboard(weekStart, weekEnd);

  const weekOf = weekStart.toISOString().slice(0, 10);
  const docId = `sales-leaderboard_${weekOf}`;

  await db.collection(FIRESTORE_COLLECTIONS.DIGESTS).doc(docId).set({
    type: "weekly-sales-leaderboard",
    weekOf,
    rankings,
    totalRevenue,
    totalBookings,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "system",
    status: "generated",
  });

  return NextResponse.json({ weekOf, agentCount: rankings.length, totalRevenue, totalBookings });
}
