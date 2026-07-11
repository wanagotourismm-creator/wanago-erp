"use client";

import { useEffect, useState } from "react";
import { fetchBookings } from "@/modules/bookings/services/booking.service";
import { fetchPackages } from "@/modules/packages/services/package.service";
import { fetchSuppliers } from "@/modules/suppliers/services/supplier.service";
import { toDate } from "@/lib/utils/helpers";
import { BOOKING_STATUS } from "@/lib/constants";
import type { Booking } from "@/modules/bookings/types";
import type { Timestamp } from "@/types/global";

export type PendingBookingApproval = { id: string; customerName: string; destination: string; daysOld: number };

export type OperationsActionStats = {
  pendingOpsApprovals: number;
  confirmedThisMonth: number;
  activePackages: number;
  activeSuppliers: number;
  oldestPending: PendingBookingApproval[];
};

const EMPTY: OperationsActionStats = {
  pendingOpsApprovals: 0, confirmedThisMonth: 0, activePackages: 0, activeSuppliers: 0, oldestPending: [],
};

// Operations' approval queue is company-wide (any booking that clears
// Finance lands here for any Ops user to confirm) — same reasoning as
// HR/Finance's dashboards, not scoped to a single employee's assignments.
export function useOperationsActionStats() {
  const [stats, setStats] = useState<OperationsActionStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [bookings, packages, suppliers] = await Promise.all([
          fetchBookings(), fetchPackages(), fetchSuppliers(),
        ]);
        if (cancelled) return;

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const ageInDays = (d: Date) => Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

        const pending = bookings.filter((b) => b.status === BOOKING_STATUS.OPS_PENDING);
        const confirmedThisMonth = bookings.filter((b: Booking) => {
          if (b.status !== BOOKING_STATUS.CONFIRMED && b.status !== BOOKING_STATUS.COMPLETED) return false;
          const approvedAt = toDate(b.opsApprovedAt as Timestamp | Date | string | null | undefined);
          return approvedAt && approvedAt >= monthStart;
        }).length;

        const oldestPending: PendingBookingApproval[] = pending
          .map((b): PendingBookingApproval | null => {
            const created = toDate(b.createdAt);
            if (!created) return null;
            return { id: b.id, customerName: b.customerName, destination: b.destination, daysOld: ageInDays(created) };
          })
          .filter((i): i is PendingBookingApproval => i !== null)
          .sort((a, b) => b.daysOld - a.daysOld)
          .slice(0, 5);

        setStats({
          pendingOpsApprovals: pending.length,
          confirmedThisMonth,
          activePackages: packages.filter((p) => p.packageStatus === "active").length,
          activeSuppliers: suppliers.filter((s) => s.supplierStatus === "active").length,
          oldestPending,
        });
      } catch (e) {
        console.error("[useOperationsActionStats] failed to load — showing zeroed stats:", e);
        if (!cancelled) setStats(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { ...stats, loading };
}
