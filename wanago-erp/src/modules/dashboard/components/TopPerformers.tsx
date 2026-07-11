"use client";

import { useMemo } from "react";
import type { DocumentData } from "firebase/firestore";
import { BOOKING_STATUS } from "@/lib/constants";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatCurrency, toDate } from "@/lib/utils/helpers";

type Performer = {
  name:    string;
  won:     number;
  revenue: number;
};

type Props = {
  // Bookings are fetched once by useDashboard() and passed down here —
  // this component previously did its own separate full-collection fetch
  // of the same data (Bookings was being downloaded in full 3 times on
  // one dashboard render: here, dashboard.service.ts, and DepartingSoon).
  bookings: DocumentData[] | null;
  loading:  boolean;
};

export function TopPerformers({ bookings, loading }: Props) {
  const performers = useMemo<Performer[]>(() => {
    if (!bookings) return [];

    // Label says "this month" — previously counted every booking ever
    // (no date or status filter at all), so a booking pending Finance
    // review or rejected months ago counted the same as a real,
    // confirmed sale this month. Restrict to confirmed/completed
    // bookings created since the start of the current month.
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const map: Record<string, Performer> = {};
    for (const b of bookings) {
      if (b.status !== BOOKING_STATUS.CONFIRMED && b.status !== BOOKING_STATUS.COMPLETED) continue;
      const created = toDate(b.createdAt);
      if (!created || created < monthStart) continue;

      const key  = b.assignedTo ?? b.createdBy ?? "Unassigned";
      const name = b.agentName  ?? key;
      if (!map[key]) map[key] = { name, won: 0, revenue: 0 };
      map[key].won++;
      map[key].revenue += b.totalAmount ?? 0;
    }

    const sorted = Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return sorted.length ? sorted : [{ name: "Unassigned", won: 0, revenue: 0 }];
  }, [bookings]);

  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

  return (
    <Card padding="none">
      <div className="p-5 pb-3">
        <CardTitle>Top Performers</CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">Revenue collected this month</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-border bg-muted/30">
              <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-8">#</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Agent</th>
              <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Won</th>
              <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Revenue (MTD)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : performers.map((p, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-base">{medals[i] ?? i + 1}</td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">{p.name}</td>
                <td className="px-4 py-3 text-right text-sm text-primary font-semibold">{p.won}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                  {formatCurrency(p.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
