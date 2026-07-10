"use client";

import { useEffect, useState } from "react";
import { fetchBookings } from "@/modules/bookings/services/booking.service";
import { toDate, formatCurrency } from "@/lib/utils/helpers";
import { BOOKING_STATUS } from "@/lib/constants";

export type MyRank = {
  rank: number | null;       // 1-based; null if this agent has no bookings this month yet
  totalAgents: number;
  myRevenue: number;
  leaderRevenue: number;
  gapToNextRank: number;     // revenue needed to overtake the agent directly above
  nextRankRevenue: number | null;
};

const EMPTY: MyRank = { rank: null, totalAgents: 0, myRevenue: 0, leaderRevenue: 0, gapToNextRank: 0, nextRankRevenue: null };

// Ranks by this-month confirmed/completed booking revenue — the same data
// TopPerformers shows company-wide, but scoped down to "where do I stand"
// for the personal dashboard, and correctly filtered to the current month
// (TopPerformers' "this month" label was previously all-time — fixed
// alongside this).
export function useMyRank(employeeId: string | null) {
  const [rank, setRank] = useState<MyRank>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        const bookings = await fetchBookings();
        if (cancelled) return;

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const revenueByAgent = new Map<string, number>();
        for (const b of bookings) {
          if (b.status !== BOOKING_STATUS.CONFIRMED && b.status !== BOOKING_STATUS.COMPLETED) continue;
          const created = toDate(b.createdAt);
          if (!created || created < monthStart) continue;
          const key = b.assignedTo ?? "unassigned";
          revenueByAgent.set(key, (revenueByAgent.get(key) ?? 0) + (b.totalAmount ?? 0));
        }

        const sorted = Array.from(revenueByAgent.entries()).sort((a, b) => b[1] - a[1]);
        const myIndex = sorted.findIndex(([id]) => id === employeeId);
        const myRevenue = myIndex >= 0 ? sorted[myIndex][1] : 0;
        const nextRankEntry = myIndex > 0 ? sorted[myIndex - 1] : null;

        setRank({
          rank: myIndex >= 0 ? myIndex + 1 : null,
          totalAgents: sorted.length,
          myRevenue,
          leaderRevenue: sorted[0]?.[1] ?? 0,
          gapToNextRank: nextRankEntry ? Math.max(0, nextRankEntry[1] - myRevenue) : 0,
          nextRankRevenue: nextRankEntry?.[1] ?? null,
        });
      } catch (e) {
        console.error("[useMyRank] failed to load — showing empty rank:", e);
        if (!cancelled) setRank(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [employeeId]);

  return { ...rank, loading };
}

export function formatRankGapMessage(r: MyRank): string {
  if (r.rank === null) return "Close your first booking this month to get on the board.";
  if (r.rank === 1) return "You're #1 this month — keep it up!";
  return `You're #${r.rank} of ${r.totalAgents} — ${formatCurrency(r.gapToNextRank)} more revenue puts you past #${r.rank - 1}.`;
}
