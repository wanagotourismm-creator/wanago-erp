"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchBookings } from "@/modules/bookings/services/booking.service";
import {
  buildTrailingMonthBuckets, bucketRevenueByMonth, computeMovingAverage,
  computeMoMChange, computeYoYChange, buildTrendPoints,
} from "@/modules/reports/services/sales-trend.service";
import { toDate } from "@/lib/utils/helpers";
import type { Booking } from "@/modules/bookings/types";
import type { Timestamp } from "@/types/global";

const MONTHS_BACK = 13; // 12 for the chart + 1 extra so YoY has a comparison point
const MOVING_AVERAGE_WINDOW = 3;

export function useSalesTrend() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBookings(await fetchBookings({ status: "confirmed" }));
    } catch {
      setError("Failed to load sales trend data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { points, momChangePct, yoyChangePct } = useMemo(() => {
    const buckets = buildTrailingMonthBuckets(MONTHS_BACK);

    // Same confirmed-date logic as useSalesTeamPerformance/fetchRevenueData
    // — Operations' approval timestamp is the "when did this actually
    // become revenue" moment, falling back to updatedAt if that's missing.
    const dated = bookings
      .map((b) => {
        const opsApprovedAt = b.opsApprovedAt as Timestamp | Date | string | null;
        const confirmedAt = toDate(opsApprovedAt) ?? toDate(b.updatedAt);
        return confirmedAt ? { totalAmount: b.totalAmount ?? 0, confirmedAt } : null;
      })
      .filter((b): b is { totalAmount: number; confirmedAt: Date } => b !== null);

    const revenue = bucketRevenueByMonth(dated, buckets);
    const movingAverage = computeMovingAverage(revenue, MOVING_AVERAGE_WINDOW);

    return {
      points: buildTrendPoints(buckets, revenue, movingAverage),
      momChangePct: computeMoMChange(revenue),
      yoyChangePct: computeYoYChange(revenue),
    };
  }, [bookings]);

  return { points, momChangePct, yoyChangePct, loading, error };
}
