"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchLeads } from "@/modules/leads/services/lead.service";
import { fetchBookings } from "@/modules/bookings/services/booking.service";
import { useIncentives } from "@/modules/incentives/hooks/useIncentives";
import { toDate } from "@/lib/utils/helpers";
import type { Lead } from "@/modules/leads/types";
import type { Booking } from "@/modules/bookings/types";
import type { SalesAgentPerformance } from "@/modules/sales-team/types";
import type { Timestamp } from "@/types/global";

export function useSalesTeamPerformance() {
  const { summaries: incentiveSummaries, loading: incentivesLoading } = useIncentives();

  const [leads,    setLeads]    = useState<Lead[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadsData, bookingsData] = await Promise.all([
        fetchLeads(),
        fetchBookings({ status: "confirmed" }),
      ]);
      setLeads(leadsData);
      setBookings(bookingsData);
    } catch {
      setError("Failed to load sales team performance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const performance = useMemo(() => {
    const groups = new Map<string, SalesAgentPerformance>();

    // Leads: bucketed by the month they were created in.
    for (const lead of leads) {
      if (!lead.assignedTo) continue;

      const createdAt = toDate(lead.createdAt);
      if (!createdAt) continue;

      const month = createdAt.getMonth();
      const year  = createdAt.getFullYear();
      const key   = `${lead.assignedTo}__${year}-${month}`;

      const existing = groups.get(key);
      if (existing) {
        existing.leadsAssigned += 1;
        if (lead.stage === "won") existing.leadsWon += 1;
      } else {
        groups.set(key, {
          agentId:         lead.assignedTo,
          agentName:       lead.agentName ?? "Unknown Agent",
          month,
          year,
          leadsAssigned:   1,
          leadsWon:        lead.stage === "won" ? 1 : 0,
          conversionRate:  0,
          revenue:         0,
          incentiveAmount: 0,
        });
      }
    }

    // Confirmed bookings: bucketed by the month Operations confirmed them
    // (same date logic as the Incentives module), contributing revenue.
    for (const booking of bookings) {
      if (!booking.assignedTo) continue;

      const opsApprovedAt = booking.opsApprovedAt as Timestamp | Date | string | null;
      const confirmedAt = toDate(opsApprovedAt) ?? toDate(booking.updatedAt);
      if (!confirmedAt) continue;

      const month = confirmedAt.getMonth();
      const year  = confirmedAt.getFullYear();
      const key   = `${booking.assignedTo}__${year}-${month}`;

      const existing = groups.get(key);
      if (existing) {
        existing.revenue += booking.totalAmount ?? 0;
      } else {
        groups.set(key, {
          agentId:         booking.assignedTo,
          agentName:       booking.agentName ?? "Unknown Agent",
          month,
          year,
          leadsAssigned:   0,
          leadsWon:        0,
          conversionRate:  0,
          revenue:         booking.totalAmount ?? 0,
          incentiveAmount: 0,
        });
      }
    }

    // Cross-reference the incentive estimate for the same agent + month.
    for (const inc of incentiveSummaries) {
      const key = `${inc.agentId}__${inc.year}-${inc.month}`;
      const existing = groups.get(key);
      if (existing) {
        existing.incentiveAmount = inc.incentiveAmount;
        if (existing.agentName === "Unknown Agent") existing.agentName = inc.agentName;
      } else {
        groups.set(key, {
          agentId:         inc.agentId,
          agentName:       inc.agentName,
          month:           inc.month,
          year:            inc.year,
          leadsAssigned:   0,
          leadsWon:        0,
          conversionRate:  0,
          revenue:         0,
          incentiveAmount: inc.incentiveAmount,
        });
      }
    }

    const list = Array.from(groups.values()).map((g) => ({
      ...g,
      conversionRate: g.leadsAssigned > 0 ? (g.leadsWon / g.leadsAssigned) * 100 : 0,
    }));

    list.sort((a, b) => {
      if (b.year !== a.year)   return b.year - a.year;
      if (b.month !== a.month) return b.month - a.month;
      return b.revenue - a.revenue;
    });

    return list;
  }, [leads, bookings, incentiveSummaries]);

  return {
    performance,
    loading: loading || incentivesLoading,
    error,
    reload: load,
  };
}
