"use client";

import { useEffect, useState } from "react";
import { fetchOperationsBookings } from "@/modules/tour-operations/services/tour-operations.service";
import {
  isStuckPastTravelDate, isClosureStuck, isPreDepartureDueSoon,
  CLOSURE_STUCK_DAYS, PRE_DEPARTURE_DUE_WITHIN_DAYS,
} from "@/modules/tour-operations/utils";
import { OPERATIONS_STAGE } from "@/lib/constants";

export type TourOperationsStats = {
  onTourCount: number;
  preDepartureDueSoonCount: number;
  stuckPastTravelDateCount: number;
  closureStuckCount: number;
};

const EMPTY: TourOperationsStats = {
  onTourCount: 0, preDepartureDueSoonCount: 0, stuckPastTravelDateCount: 0, closureStuckCount: 0,
};

export function useTourOperationsStats() {
  const [stats, setStats] = useState<TourOperationsStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const records = await fetchOperationsBookings();
        if (cancelled) return;

        setStats({
          onTourCount: records.filter((r) => r.status === OPERATIONS_STAGE.TOUR_ONGOING).length,
          preDepartureDueSoonCount: records.filter((r) => isPreDepartureDueSoon(r, PRE_DEPARTURE_DUE_WITHIN_DAYS)).length,
          stuckPastTravelDateCount: records.filter(isStuckPastTravelDate).length,
          closureStuckCount: records.filter((r) => isClosureStuck(r, CLOSURE_STUCK_DAYS)).length,
        });
      } catch (e) {
        console.error("[useTourOperationsStats] failed to load — showing zeroed stats:", e);
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
