"use client";

import { useState, useEffect } from "react";
import { fetchAttendanceRecords } from "@/modules/hrms/attendance/services/attendance.service";

export type DayBucket = { date: string; avgHours: number };

export function useAttendanceSummary() {
  const [days, setDays] = useState<DayBucket[]>([]);
  const [weeklyAvgHours, setWeeklyAvgHours] = useState(0);
  const [officePct, setOfficePct] = useState(0);
  const [wfhPct, setWfhPct] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendanceRecords()
      .then((records) => {
        const last7Dates = Array.from(new Set(records.map((r) => r.date))).sort().slice(-7);
        const recent = records.filter((r) => last7Dates.includes(r.date));

        setDays(last7Dates.map((date) => {
          const dayRecords = recent.filter((r) => r.date === date && r.hoursWorked != null);
          const avgHours = dayRecords.length
            ? dayRecords.reduce((sum, r) => sum + (r.hoursWorked ?? 0), 0) / dayRecords.length
            : 0;
          return { date, avgHours };
        }));

        const hoursRecords = recent.filter((r) => r.hoursWorked != null);
        setWeeklyAvgHours(hoursRecords.length
          ? hoursRecords.reduce((sum, r) => sum + (r.hoursWorked ?? 0), 0) / hoursRecords.length
          : 0);

        const workingRecords = recent.filter((r) => r.status === "present" || r.status === "half_day" || r.status === "wfh");
        const wfhCount = workingRecords.filter((r) => r.status === "wfh").length;
        const total = workingRecords.length || 1;
        const office = Math.round(((workingRecords.length - wfhCount) / total) * 100);
        setOfficePct(office);
        setWfhPct(100 - office);
      })
      .catch((err) => console.error("[useAttendanceSummary] failed to load attendance data — showing as empty:", err))
      .finally(() => setLoading(false));
  }, []);

  return { loading, days, weeklyAvgHours, officePct, wfhPct };
}
