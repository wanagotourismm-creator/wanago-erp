"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { fetchAttendanceRecords } from "@/modules/hrms/attendance/services/attendance.service";
import { fetchLeaves } from "@/modules/hrms/leaves/services/leave.service";
import { fetchRegularizations } from "@/modules/hrms/regularization/services/regularization.service";
import { fetchJobOpenings } from "@/modules/recruitment/jobs/services/job.service";
import { fetchReviews } from "@/modules/performance/reviews/services/review.service";
import { toDate } from "@/lib/utils/helpers";
import type { Timestamp } from "@/types/global";
import type { Employee, AttendanceRecord, LeaveRequest, AttendanceRegularization } from "@/modules/hrms/shared/types";

// LeaveRequest.createdAt/approvedAt are typed to allow a FieldValue write
// sentinel, but reads back always resolve to a real Timestamp/Date/string —
// this cast reflects that read-time guarantee for toDate()'s narrower input type.
function safeToDate(value: Timestamp | Date | string | null | undefined | unknown): Date | null {
  return toDate(value as Timestamp | Date | string | null | undefined);
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export type EmployeeToday = {
  employee: Employee;
  status: "present" | "absent" | "half_day" | "wfh" | "on_leave" | "unmarked";
  outsideGeofence: boolean;
};

export type DepartmentSummary = {
  department: string;
  headcount: number;
  presentToday: number;
  pendingApprovals: number;
};

export type Trend = { value: number; direction: "up" | "down" } | null;

export type HeadcountTrendPoint = { month: string; count: number };

export type UpcomingEvent = {
  id: string;
  label: string;
  type: "review" | "leave";
  date: string;
};

export type ActivityItem = {
  id: string;
  text: string;
  timestamp: Date;
};

function computeTrend(current: number, previous: number): Trend {
  if (previous <= 0) return null;
  const diff = current - previous;
  const pct = Math.round((Math.abs(diff) / previous) * 100);
  if (pct === 0) return null;
  return { value: pct, direction: diff >= 0 ? "up" : "down" };
}

function buildHeadcountTrend(employees: Employee[]): HeadcountTrendPoint[] {
  const now = new Date();
  const points: HeadcountTrendPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const cutoff = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    const count = employees.filter((e) => {
      const joined = e.dateOfJoining ? new Date(e.dateOfJoining) : null;
      return !joined || joined < cutoff;
    }).length;
    points.push({ month: monthStart.toLocaleDateString("en-IN", { month: "short" }), count });
  }
  return points;
}

export function useHrOverview() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [regularizations, setRegularizations] = useState<AttendanceRegularization[]>([]);
  const [openJobsCount, setOpenJobsCount] = useState(0);
  const [jobsTrend, setJobsTrend] = useState<Trend>(null);
  const [reviewsUpcoming, setReviewsUpcoming] = useState<UpcomingEvent[]>([]);
  const [reviewsTrend, setReviewsTrend] = useState<Trend>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, att, lvs, regs, jobs, reviews] = await Promise.all([
        fetchEmployees(),
        fetchAttendanceRecords(),
        fetchLeaves(),
        fetchRegularizations(),
        fetchJobOpenings(),
        fetchReviews(),
      ]);
      setEmployees(emps.filter((e) => e.employeeStatus === "active"));
      setAttendance(att);
      setLeaves(lvs);
      setRegularizations(regs);

      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      setOpenJobsCount(jobs.filter((j) => j.jobStatus === "open").length);
      const jobsThisMonth = jobs.filter((j) => new Date(j.postedDate) >= startOfThisMonth).length;
      const jobsLastMonth = jobs.filter((j) => {
        const d = new Date(j.postedDate);
        return d >= startOfLastMonth && d < startOfThisMonth;
      }).length;
      setJobsTrend(computeTrend(jobsThisMonth, jobsLastMonth));

      const in30 = new Date(now); in30.setDate(in30.getDate() + 30);
      const past30 = new Date(now); past30.setDate(past30.getDate() - 30);
      const upcoming = reviews
        .filter((r) => r.status !== "acknowledged" && new Date(r.reviewDate) >= now && new Date(r.reviewDate) <= in30)
        .map((r) => ({ id: r.id, label: `${r.employeeName} — ${r.reviewType} review`, type: "review" as const, date: r.reviewDate }));
      setReviewsUpcoming(upcoming);
      const pastWindowCount = reviews.filter((r) => {
        const d = new Date(r.reviewDate);
        return d >= past30 && d < now;
      }).length;
      setReviewsTrend(computeTrend(upcoming.length, pastWindowCount));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = todayStr();
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  const todayAttendance = attendance.filter((a) => a.date === today);
  const todayAttendanceByEmployee = new Map(todayAttendance.map((a) => [a.employeeId, a]));

  const onLeaveTodayIds = new Set(
    leaves
      .filter((l) => l.status === "approved" && l.fromDate <= today && l.toDate >= today)
      .map((l) => l.employeeId)
  );

  const employeesToday: EmployeeToday[] = employees.map((employee) => {
    const record = todayAttendanceByEmployee.get(employee.id);
    const outsideGeofence = record?.withinGeofence === false;
    if (record) return { employee, status: record.status === "leave" ? "on_leave" : (record.status as EmployeeToday["status"]), outsideGeofence };
    if (onLeaveTodayIds.has(employee.id)) return { employee, status: "on_leave", outsideGeofence: false };
    return { employee, status: "unmarked", outsideGeofence: false };
  });

  const pendingLeaves = leaves.filter((l) => l.status === "pending");
  const pendingRegularizations = regularizations.filter((r) => r.regularizationStatus === "pending");

  const headcount = employees.length;
  const presentToday = employeesToday.filter((e) => e.status === "present" || e.status === "half_day" || e.status === "wfh").length;
  const onLeaveToday = employeesToday.filter((e) => e.status === "on_leave").length;
  const absentToday = employeesToday.filter((e) => e.status === "absent").length;
  const unmarkedToday = employeesToday.filter((e) => e.status === "unmarked").length;
  const attendancePct = headcount === 0 ? 0 : Math.round((presentToday / headcount) * 100);
  const awaitingApproval = pendingLeaves.length + pendingRegularizations.length;

  const yesterdayAttendance = attendance.filter((a) => a.date === yesterday);
  const yesterdayPresent = yesterdayAttendance.filter((a) => a.status === "present" || a.status === "half_day" || a.status === "wfh").length;
  const attendancePctYesterday = headcount === 0 ? 0 : Math.round((yesterdayPresent / headcount) * 100);
  const attendanceTrend = computeTrend(attendancePct, attendancePctYesterday);

  const startOfThisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const startOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const newHiresThisMonth = employees.filter((e) => e.dateOfJoining && new Date(e.dateOfJoining) >= startOfThisMonth).length;
  const newHiresLastMonth = employees.filter((e) => {
    if (!e.dateOfJoining) return false;
    const d = new Date(e.dateOfJoining);
    return d >= startOfLastMonth && d < startOfThisMonth;
  }).length;
  const newHiresTrend = computeTrend(newHiresThisMonth, newHiresLastMonth);

  const cutoff30 = new Date(); cutoff30.setDate(cutoff30.getDate() - 30);
  const headcount30DaysAgo = employees.filter((e) => !e.dateOfJoining || new Date(e.dateOfJoining) <= cutoff30).length;
  const headcountTrendPct = computeTrend(headcount, headcount30DaysAgo);

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const pendingLeavesThisWeek = pendingLeaves.filter((l) => { const d = toDate(l.createdAt); return d && d >= weekAgo; }).length;
  const pendingLeavesLastWeek = pendingLeaves.filter((l) => {
    const d = toDate(l.createdAt);
    return d && d >= twoWeeksAgo && d < weekAgo;
  }).length;
  const pendingLeavesTrend = computeTrend(pendingLeavesThisWeek, pendingLeavesLastWeek);

  const upcomingLeaveEvents: UpcomingEvent[] = leaves
    .filter((l) => l.status === "approved" && l.fromDate >= today)
    .map((l) => ({ id: l.id, label: `${l.employeeName} — ${l.leaveType} leave`, type: "leave" as const, date: l.fromDate }));

  const upcomingEvents: UpcomingEvent[] = [...reviewsUpcoming, ...upcomingLeaveEvents]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  const recentActivity: ActivityItem[] = [
    ...leaves
      .filter((l) => l.status === "approved" && l.approvedAt)
      .map((l) => ({ id: `leave-${l.id}`, text: `${l.employeeName}'s ${l.leaveType} leave was approved`, timestamp: safeToDate(l.approvedAt) })),
    ...employees
      .filter((e) => e.dateOfJoining)
      .map((e) => ({ id: `hire-${e.id}`, text: `${e.fullName} joined as ${e.designation}`, timestamp: new Date(e.dateOfJoining as string) })),
  ]
    .filter((a): a is ActivityItem => a.timestamp instanceof Date && !isNaN(a.timestamp.getTime()))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 8);

  const departments = Array.from(new Set(employees.map((e) => e.department))).sort();
  const departmentSummaries: DepartmentSummary[] = departments.map((department) => {
    const deptEmployees = employeesToday.filter((e) => e.employee.department === department);
    const deptIds = new Set(deptEmployees.map((e) => e.employee.id));
    return {
      department,
      headcount: deptEmployees.length,
      presentToday: deptEmployees.filter((e) => e.status === "present" || e.status === "half_day" || e.status === "wfh").length,
      pendingApprovals:
        pendingLeaves.filter((l) => deptIds.has(l.employeeId)).length +
        pendingRegularizations.filter((r) => deptIds.has(r.employeeId)).length,
    };
  });

  const headcountTrend = buildHeadcountTrend(employees);

  return {
    loading, employeesToday, departmentSummaries,
    headcount, attendancePct, onLeaveToday, absentToday, unmarkedToday, awaitingApproval,
    headcountTrendPct, attendanceTrend,
    newHiresThisMonth, newHiresTrend,
    openJobsCount, jobsTrend,
    pendingLeavesCount: pendingLeaves.length, pendingLeavesTrend,
    upcomingReviewsCount: reviewsUpcoming.length, reviewsTrend,
    headcountTrend, upcomingEvents, recentActivity,
    reload: load,
  };
}
