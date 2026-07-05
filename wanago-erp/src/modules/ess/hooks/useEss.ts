"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { fetchEmployeeByUserId, fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { fetchAttendanceByEmployee, createAttendanceRecord, updateAttendanceRecord } from "@/modules/hrms/attendance/services/attendance.service";
import { fetchLeaves, fetchLeavesByEmployee, createLeaveRequest, cancelLeaveRequest, approveLeaveRequest, rejectLeaveRequest } from "@/modules/hrms/leaves/services/leave.service";
import { fetchHolidays } from "@/modules/admin/holidays/services/holiday.service";
import type { Employee, AttendanceRecord, LeaveRequest } from "@/modules/hrms/shared/types";
import type { EssLeaveApplySchema } from "@/modules/ess/schemas";
import type { Holiday } from "@/modules/admin/holidays/types";

const todayStr = () => new Date().toISOString().slice(0, 10);
const nowTime  = () => new Date().toTimeString().slice(0, 5);

export function useEss() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [directReports, setDirectReports] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [teamLeaves, setTeamLeaves] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

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
        const [allEmployees, att, myLeaves] = await Promise.all([
          fetchEmployees(),
          fetchAttendanceByEmployee(emp.id),
          fetchLeavesByEmployee(emp.id),
        ]);
        setAttendance(att);
        setLeaves(myLeaves);

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

  async function clockIn() {
    if (!employee || !user) return { error: "No employee profile is linked to your account yet. Contact HR." };
    try {
      const rec = await createAttendanceRecord({
        employeeId: employee.id, employeeName: employee.fullName,
        date: today, status: "present", clockIn: nowTime(), clockOut: "", notes: "",
        officeId: employee.officeId,
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
    loading, employee, directReports, attendance, leaves, teamLeaves, holidays,
    today, todayRecord, isClockedIn, isClockedOut,
    clockIn, clockOut, applyLeave, cancelMyLeave, decideTeamLeave, reload: load,
  };
}
