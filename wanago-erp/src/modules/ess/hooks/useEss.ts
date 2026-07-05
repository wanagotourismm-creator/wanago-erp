"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { fetchEmployeeByUserId, fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { fetchAttendanceByEmployee, createAttendanceRecord, updateAttendanceRecord } from "@/modules/hrms/attendance/services/attendance.service";
import { fetchLeaves, fetchLeavesByEmployee, createLeaveRequest, cancelLeaveRequest, approveLeaveRequest, rejectLeaveRequest } from "@/modules/hrms/leaves/services/leave.service";
import { fetchHolidays } from "@/modules/admin/holidays/services/holiday.service";
import { fetchPayrollByEmployee } from "@/modules/hrms/payroll/services/payroll.service";
import { fetchRecentActivity, type ActivityLogEntry } from "@/lib/activity-log";
import type { Employee, AttendanceRecord, LeaveRequest, PayrollRecord } from "@/modules/hrms/shared/types";
import type { EssLeaveApplySchema } from "@/modules/ess/schemas";
import type { Holiday } from "@/modules/admin/holidays/types";

const todayStr = () => new Date().toISOString().slice(0, 10);
const nowTime  = () => new Date().toTimeString().slice(0, 5);

export const BREAK_ALLOWANCE_MINUTES = 60;

export const LEAVE_ENTITLEMENTS: Record<string, number> = {
  casual: 12,
  sick:   12,
  earned: 15,
};

export type LeaveBalance = { type: string; entitlement: number; used: number; remaining: number };

export function useEss() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [directReports, setDirectReports] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [teamLeaves, setTeamLeaves] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [emp, hols] = await Promise.all([
        fetchEmployeeByUserId(user.uid, user.email),
        fetchHolidays(),
      ]);
      setEmployee(emp);
      setHolidays(hols);

      if (emp) {
        const [allEmployees, att, myLeaves, myPayroll, recentActivity] = await Promise.all([
          fetchEmployees(),
          fetchAttendanceByEmployee(emp.id),
          fetchLeavesByEmployee(emp.id),
          fetchPayrollByEmployee(emp.id),
          fetchRecentActivity(200),
        ]);
        setAttendance(att);
        setLeaves(myLeaves);
        setPayroll(myPayroll);
        setActivity(recentActivity.filter((a) => a.actorId === user.uid));

        const reports = allEmployees.filter((e) => e.reportingManagerId === emp.id);
        setDirectReports(reports);

        if (reports.length > 0) {
          const reportIds = new Set(reports.map((r) => r.id));
          const all = await fetchLeaves();
          setTeamLeaves(all.filter((l) => reportIds.has(l.employeeId) && l.status === "pending"));
        } else {
          setTeamLeaves([]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const today = todayStr();
  const todayRecord  = attendance.find((a) => a.date === today) ?? null;
  const isClockedIn  = !!todayRecord?.clockIn && !todayRecord?.clockOut;
  const isClockedOut = !!todayRecord?.clockIn && !!todayRecord?.clockOut;
  const isOnBreak    = !!todayRecord?.breakStartTime;

  const currentYear = new Date().getFullYear();
  const leaveBalances: LeaveBalance[] = Object.entries(LEAVE_ENTITLEMENTS).map(([type, entitlement]) => {
    const used = leaves
      .filter((l) => l.leaveType === type && l.status === "approved" && new Date(l.fromDate).getFullYear() === currentYear)
      .reduce((sum, l) => sum + l.days, 0);
    return { type, entitlement, used, remaining: Math.max(0, entitlement - used) };
  });

  async function clockIn() {
    if (!employee || !user) return { error: "No employee profile is linked to your account yet. Contact HR." };
    try {
      const rec = await createAttendanceRecord({
        employeeId: employee.id, employeeName: employee.fullName,
        date: today, status: "present", clockIn: nowTime(), clockOut: "", notes: "",
        officeId: employee.officeId, breakStartTime: null, breakMinutes: 0,
      }, user.uid);
      setAttendance((p) => [rec, ...p]);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to clock in" };
    }
  }

  async function clockOut() {
    if (!todayRecord) return { error: "You haven't clocked in today" };
    try {
      await updateAttendanceRecord(todayRecord.id, { clockOut: nowTime() });
      await load();
      return { error: null };
    } catch {
      return { error: "Failed to clock out" };
    }
  }

  async function startBreak() {
    if (!todayRecord) return { error: "Clock in first" };
    try {
      await updateAttendanceRecord(todayRecord.id, { breakStartTime: nowTime() });
      await load();
      return { error: null };
    } catch {
      return { error: "Failed to start break" };
    }
  }

  async function endBreak() {
    if (!todayRecord?.breakStartTime) return { error: "You're not on a break" };
    try {
      const [sh, sm] = todayRecord.breakStartTime.split(":").map(Number);
      const [nh, nm] = nowTime().split(":").map(Number);
      const elapsed = Math.max(0, (nh * 60 + nm) - (sh * 60 + sm));
      await updateAttendanceRecord(todayRecord.id, {
        breakStartTime: null,
        breakMinutes: (todayRecord.breakMinutes ?? 0) + elapsed,
      });
      await load();
      return { error: null };
    } catch {
      return { error: "Failed to end break" };
    }
  }

  async function applyLeave(data: EssLeaveApplySchema) {
    if (!employee || !user) return { error: "No employee profile is linked to your account yet. Contact HR." };
    try {
      const l = await createLeaveRequest({
        ...data,
        employeeId:   employee.id,
        employeeName: employee.fullName,
        officeId:     employee.officeId,
      }, user.uid);
      setLeaves((p) => [l, ...p]);
      return { error: null };
    } catch {
      return { error: "Failed to submit leave request" };
    }
  }

  async function cancelMyLeave(id: string) {
    try {
      await cancelLeaveRequest(id);
      setLeaves((p) => p.map((l) => (l.id === id ? { ...l, status: "cancelled" as const } : l)));
      return { error: null };
    } catch {
      return { error: "Failed to cancel leave request" };
    }
  }

  async function decideTeamLeave(id: string, decision: "approve" | "reject") {
    if (!user) return { error: "Not signed in" };
    try {
      if (decision === "approve") await approveLeaveRequest(id, user.uid);
      else await rejectLeaveRequest(id, user.uid);
      setTeamLeaves((p) => p.filter((l) => l.id !== id));
      return { error: null };
    } catch {
      return { error: "Failed to record decision" };
    }
  }

  return {
    loading, employee, directReports, attendance, leaves, teamLeaves, holidays, payroll, activity,
    today, todayRecord, isClockedIn, isClockedOut, isOnBreak, leaveBalances,
    clockIn, clockOut, startBreak, endBreak, applyLeave, cancelMyLeave, decideTeamLeave, reload: load,
  };
}
