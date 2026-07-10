"use client";

import { useEffect, useState } from "react";
import { fetchLeads } from "@/modules/leads/services/lead.service";
import { fetchBookings } from "@/modules/bookings/services/booking.service";
import { toDate } from "@/lib/utils/helpers";
import { LEAD_STAGES, BOOKING_STATUS } from "@/lib/constants";

export type MyPipelineStats = {
  activeLeads: number;
  followUpPending: number;
  wonThisMonth: number;
  totalThisMonth: number;
  conversionRate: number; // won / (won + lost) this month, as a percent
  bookingsThisMonth: number;
  revenueThisMonth: number;
  profitThisMonth: number;
};

const EMPTY: MyPipelineStats = {
  activeLeads: 0, followUpPending: 0, wonThisMonth: 0, totalThisMonth: 0, conversionRate: 0,
  bookingsThisMonth: 0, revenueThisMonth: 0, profitThisMonth: 0,
};

// Everything here is scoped to the logged-in sales rep's own leads/bookings
// (assignedTo === employeeId) — this is the personal-dashboard counterpart
// to the company-wide stats shown on the admin dashboard, not a general-
// purpose reporting hook.
export function useMyPipelineStats(employeeId: string | null) {
  const [stats, setStats] = useState<MyPipelineStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        const [leads, allBookings] = await Promise.all([
          fetchLeads({ assignedTo: employeeId! }),
          fetchBookings(),
        ]);
        if (cancelled) return;

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const myLeads = leads;
        const activeLeads = myLeads.filter(
          (l) => l.stage !== LEAD_STAGES.WON && l.stage !== LEAD_STAGES.LOST
        ).length;
        const followUpPending = myLeads.filter((l) => l.stage === LEAD_STAGES.FOLLOW_UP).length;

        const leadsThisMonth = myLeads.filter((l) => {
          const created = toDate(l.createdAt);
          return created && created >= monthStart;
        });
        const wonThisMonth = leadsThisMonth.filter((l) => l.stage === LEAD_STAGES.WON).length;
        const lostThisMonth = leadsThisMonth.filter((l) => l.stage === LEAD_STAGES.LOST).length;
        const decided = wonThisMonth + lostThisMonth;
        const conversionRate = decided > 0 ? (wonThisMonth / decided) * 100 : 0;

        const myBookings = allBookings.filter((b) => b.assignedTo === employeeId);
        const confirmedThisMonth = myBookings.filter((b) => {
          if (b.status !== BOOKING_STATUS.CONFIRMED && b.status !== BOOKING_STATUS.COMPLETED) return false;
          const created = toDate(b.createdAt);
          return created && created >= monthStart;
        });

        setStats({
          activeLeads,
          followUpPending,
          wonThisMonth,
          totalThisMonth: leadsThisMonth.length,
          conversionRate,
          bookingsThisMonth: confirmedThisMonth.length,
          revenueThisMonth: confirmedThisMonth.reduce((sum, b) => sum + (b.totalAmount ?? 0), 0),
          profitThisMonth: confirmedThisMonth.reduce((sum, b) => sum + (b.profitAmount ?? 0), 0),
        });
      } catch (e) {
        console.error("[useMyPipelineStats] failed to load — showing zeroed stats:", e);
        if (!cancelled) setStats(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [employeeId]);

  return { ...stats, loading };
}
