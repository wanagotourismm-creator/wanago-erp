"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchBookings } from "@/modules/bookings/services/booking.service";
import { fetchCompanySettings } from "@/modules/admin/settings/services/company-settings.service";
import { toDate } from "@/lib/utils/helpers";
import type { AgentIncentiveSummary } from "@/modules/incentives/types";
import type { Timestamp } from "@/types/global";

export function useIncentives() {
  const [summaries, setSummaries] = useState<AgentIncentiveSummary[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookings, settings] = await Promise.all([
        fetchBookings({ status: "confirmed" }),
        fetchCompanySettings(),
      ]);

      const rate = settings.incentiveRatePercent;
      const groups = new Map<string, AgentIncentiveSummary>();

      for (const booking of bookings) {
        if (booking.profitAmount == null || !booking.assignedTo) continue;

        const opsApprovedAt = booking.opsApprovedAt as Timestamp | Date | string | null;
        const confirmedAt = toDate(opsApprovedAt) ?? toDate(booking.updatedAt);
        if (!confirmedAt) continue;

        const month = confirmedAt.getMonth();
        const year  = confirmedAt.getFullYear();
        const key   = `${booking.assignedTo}__${year}-${month}`;

        const existing = groups.get(key);
        if (existing) {
          existing.bookingsCount += 1;
          existing.totalProfit   += booking.profitAmount;
        } else {
          groups.set(key, {
            agentId:              booking.assignedTo,
            agentName:            booking.agentName ?? "Unknown Agent",
            month,
            year,
            bookingsCount:        1,
            totalProfit:          booking.profitAmount,
            incentiveRatePercent: rate,
            incentiveAmount:      0,
          });
        }
      }

      const list = Array.from(groups.values()).map((g) => ({
        ...g,
        incentiveAmount: g.totalProfit * (g.incentiveRatePercent / 100),
      }));

      list.sort((a, b) => {
        if (b.year !== a.year)   return b.year - a.year;
        if (b.month !== a.month) return b.month - a.month;
        return b.incentiveAmount - a.incentiveAmount;
      });

      setSummaries(list);
    } catch {
      setError("Failed to load incentives");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { summaries, loading, error, reload: load };
}
