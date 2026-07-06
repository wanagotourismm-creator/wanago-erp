"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchLeaves } from "@/modules/hrms/leaves/services/leave.service";
import { fetchReviews } from "@/modules/performance/reviews/services/review.service";
import type { LeaveRequest } from "@/modules/hrms/shared/types";
import type { PerformanceReview } from "@/modules/performance/reviews/types";

export type HrCalendarDay = {
  leaves:  LeaveRequest[];
  reviews: PerformanceReview[];
};

function toDateOnly(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useHrCalendar() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [leaveData, reviewData] = await Promise.all([fetchLeaves(), fetchReviews()]);
      setLeaves(leaveData);
      setReviews(reviewData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, HrCalendarDay>();

    function getDay(key: string): HrCalendarDay {
      let day = map.get(key);
      if (!day) {
        day = { leaves: [], reviews: [] };
        map.set(key, day);
      }
      return day;
    }

    leaves
      .filter((l) => l.status === "approved")
      .forEach((leave) => {
        const from = toDateOnly(leave.fromDate);
        const to = toDateOnly(leave.toDate);
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
          getDay(formatKey(d)).leaves.push(leave);
        }
      });

    reviews
      .filter((r) => r.status !== "acknowledged")
      .forEach((review) => {
        const key = formatKey(toDateOnly(review.reviewDate));
        getDay(key).reviews.push(review);
      });

    return map;
  }, [leaves, reviews]);

  return { loading, eventsByDate, reload: load };
}
