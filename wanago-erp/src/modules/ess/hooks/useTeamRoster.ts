"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAttendanceRecords } from "@/modules/hrms/attendance/services/attendance.service";
import { fetchLeaves } from "@/modules/hrms/leaves/services/leave.service";
import type { Employee, AttendanceRecord, LeaveRequest } from "@/modules/hrms/shared/types";

const todayStr = () => new Date().toISOString().slice(0, 10);

export type TeamMemberStatus = {
  employee: Employee;
  todayStatus: "present" | "absent" | "half_day" | "wfh" | "on_leave" | "unmarked";
  presentDaysThisMonth: number;
  pendingRequests: number;
};

// Team-scoped mirror of useHrOverview's company-wide computation — fetches
// the same collections and filters client-side to the manager's direct
// reports, rather than adding a new employee-scoped query pattern.
export function useTeamRoster(directReports: Employee[]) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (directReports.length === 0) {
      setAttendance([]);
      setLeaves([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [att, lvs] = await Promise.all([fetchAttendanceRecords(), fetchLeaves()]);
      setAttendance(att);
      setLeaves(lvs);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directReports.length]);

  useEffect(() => { load(); }, [load]);

  const today = todayStr();
  const month = today.slice(0, 7);
  const reportIds = new Set(directReports.map((r) => r.id));

  const teamAttendance = attendance.filter((a) => reportIds.has(a.employeeId));
  const teamLeaves = leaves.filter((l) => reportIds.has(l.employeeId));

  const roster: TeamMemberStatus[] = directReports.map((employee) => {
    const todayRecord = teamAttendance.find((a) => a.employeeId === employee.id && a.date === today);
    const onLeaveToday = teamLeaves.some((l) =>
      l.status === "approved" && l.employeeId === employee.id && l.fromDate <= today && l.toDate >= today
    );
    const todayStatus: TeamMemberStatus["todayStatus"] = todayRecord
      ? (todayRecord.status === "leave" ? "on_leave" : (todayRecord.status as TeamMemberStatus["todayStatus"]))
      : onLeaveToday ? "on_leave" : "unmarked";
    const presentDaysThisMonth = teamAttendance.filter(
      (a) => a.employeeId === employee.id && a.date.startsWith(month) && a.status === "present"
    ).length;
    const pendingRequests = teamLeaves.filter((l) => l.employeeId === employee.id && l.status === "pending").length;
    return { employee, todayStatus, presentDaysThisMonth, pendingRequests };
  });

  return { roster, loading, reload: load };
}
