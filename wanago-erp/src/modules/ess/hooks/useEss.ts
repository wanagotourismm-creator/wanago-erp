"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { fetchEmployeeByUserId, fetchEmployees, fetchEmployeeById } from "@/modules/hrms/employees/services/employee.service";
import { fetchAttendanceByEmployee, createAttendanceRecord, updateAttendanceRecord } from "@/modules/hrms/attendance/services/attendance.service";
import { fetchLeaves, fetchLeavesByEmployee, createLeaveRequest, cancelLeaveRequest, approveLeaveRequest, rejectLeaveRequest } from "@/modules/hrms/leaves/services/leave.service";
import { fetchRegularizations, fetchRegularizationsByEmployee, createRegularizationRequest, approveRegularization, rejectRegularization } from "@/modules/hrms/regularization/services/regularization.service";
import { fetchHolidays } from "@/modules/admin/holidays/services/holiday.service";
import { fetchPayrollByEmployee } from "@/modules/hrms/payroll/services/payroll.service";
import { fetchAssetsByEmployee } from "@/modules/assets/services/asset.service";
import { fetchAssetRequests, fetchAssetRequestsByEmployee, createAssetRequest, approveAssetRequest, rejectAssetRequest } from "@/modules/assets/services/asset-request.service";
import { fetchTicketsByReporter, createTicket } from "@/modules/tickets/services/ticket.service";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import { getCurrentPosition, distanceMeters } from "@/lib/geo";
import { notifyUser } from "@/lib/notify";
import { fetchLeavePolicy, DEFAULT_LEAVE_POLICY, LEAVE_TYPE_ORDER, type LeavePolicy } from "@/modules/leavepolicy/services/leave-policy.service";
import { fetchRecentActivity, type ActivityLogEntry } from "@/lib/activity-log";
import type { Employee, AttendanceRecord, LeaveRequest, PayrollRecord, AttendanceRegularization } from "@/modules/hrms/shared/types";
import type { Asset, AssetRequest } from "@/modules/assets/types";
import type { Ticket } from "@/modules/tickets/types";
import type { Office } from "@/modules/admin/offices/types";
import type { EssLeaveApplySchema, EssRegularizationApplySchema } from "@/modules/ess/schemas";
import type { EssAssetRequestSchema } from "@/modules/assets/schemas";
import type { EssTicketReportSchema } from "@/modules/tickets/schemas";
import type { Holiday } from "@/modules/admin/holidays/types";

const todayStr = () => new Date().toISOString().slice(0, 10);
const nowTime  = () => new Date().toTimeString().slice(0, 5);

export const BREAK_ALLOWANCE_MINUTES = 60;

export type LeaveBalance = { type: string; entitlement: number; used: number; remaining: number };

export type InboxItem =
  | { kind: "leave"; id: string; leave: LeaveRequest }
  | { kind: "regularization"; id: string; regularization: AttendanceRegularization }
  | { kind: "asset"; id: string; assetRequest: AssetRequest };

export function useEss() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [directReports, setDirectReports] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [regularizations, setRegularizations] = useState<AttendanceRegularization[]>([]);
  const [teamLeaves, setTeamLeaves] = useState<LeaveRequest[]>([]);
  const [teamRegularizations, setTeamRegularizations] = useState<AttendanceRegularization[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [myAssets, setMyAssets] = useState<Asset[]>([]);
  const [assetRequests, setAssetRequests] = useState<AssetRequest[]>([]);
  const [teamAssetRequests, setTeamAssetRequests] = useState<AssetRequest[]>([]);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [office, setOffice] = useState<Office | null>(null);
  const [leavePolicy, setLeavePolicy] = useState<LeavePolicy>(DEFAULT_LEAVE_POLICY);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [emp, hols, policy] = await Promise.all([
        fetchEmployeeByUserId(user.uid, user.email),
        fetchHolidays(),
        fetchLeavePolicy(),
      ]);
      setEmployee(emp);
      setHolidays(hols);
      setLeavePolicy(policy);

      if (emp) {
        const [allEmployees, att, myLeaves, myRegs, myPayroll, recentActivity, empAssets, myAssetReqs, myTix, offices] = await Promise.all([
          fetchEmployees(),
          fetchAttendanceByEmployee(emp.id),
          fetchLeavesByEmployee(emp.id),
          fetchRegularizationsByEmployee(emp.id),
          fetchPayrollByEmployee(emp.id),
          fetchRecentActivity(200),
          fetchAssetsByEmployee(emp.id),
          fetchAssetRequestsByEmployee(emp.id),
          fetchTicketsByReporter(emp.id),
          fetchOffices(),
        ]);
        setAttendance(att);
        setLeaves(myLeaves);
        setRegularizations(myRegs);
        setPayroll(myPayroll);
        setActivity(recentActivity.filter((a) => a.actorId === user.uid));
        setMyAssets(empAssets);
        setAssetRequests(myAssetReqs);
        setMyTickets(myTix);
        setOffice(offices.find((o) => o.id === emp.officeId) ?? null);

        const reports = allEmployees.filter((e) => e.reportingManagerId === emp.id);
        setDirectReports(reports);

        if (reports.length > 0) {
          const reportIds = new Set(reports.map((r) => r.id));
          const [allLeaves, allRegs, allAssetReqs] = await Promise.all([fetchLeaves(), fetchRegularizations(), fetchAssetRequests()]);
          setTeamLeaves(allLeaves.filter((l) => reportIds.has(l.employeeId) && l.status === "pending"));
          setTeamRegularizations(allRegs.filter((r) => reportIds.has(r.employeeId) && r.regularizationStatus === "pending"));
          setTeamAssetRequests(allAssetReqs.filter((r) => reportIds.has(r.employeeId) && r.requestStatus === "pending"));
        } else {
          setTeamLeaves([]);
          setTeamRegularizations([]);
          setTeamAssetRequests([]);
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
  const enabledLeaveTypes = LEAVE_TYPE_ORDER.filter((t) => leavePolicy.leaveTypes[t]?.enabled);
  const leaveBalances: LeaveBalance[] = enabledLeaveTypes.map((type) => {
    const entitlement = leavePolicy.leaveTypes[type].annualDays;
    const used = leaves
      .filter((l) => l.leaveType === type && l.status === "approved" && new Date(l.fromDate).getFullYear() === currentYear)
      .reduce((sum, l) => sum + l.days, 0);
    return { type, entitlement, used, remaining: Math.max(0, entitlement - used) };
  });

  const teamInbox: InboxItem[] = [
    ...teamLeaves.map((l): InboxItem => ({ kind: "leave", id: l.id, leave: l })),
    ...teamRegularizations.map((r): InboxItem => ({ kind: "regularization", id: r.id, regularization: r })),
    ...teamAssetRequests.map((r): InboxItem => ({ kind: "asset", id: r.id, assetRequest: r })),
  ];

  async function clockIn() {
    if (!employee || !user) return { error: "No employee profile is linked to your account yet. Contact HR." };
    try {
      const pos = await getCurrentPosition();
      let withinGeofence: boolean | null = null;
      if (pos && office?.latitude != null && office?.longitude != null && office?.geofenceRadiusMeters != null) {
        const distance = distanceMeters(pos.lat, pos.lng, office.latitude, office.longitude);
        withinGeofence = distance <= office.geofenceRadiusMeters;
      }

      const rec = await createAttendanceRecord({
        employeeId: employee.id, employeeName: employee.fullName,
        date: today, status: "present", clockIn: nowTime(), clockOut: "", notes: "",
        officeId: employee.officeId, breakStartTime: null, breakMinutes: 0,
        clockInLat: pos?.lat ?? null, clockInLng: pos?.lng ?? null, withinGeofence,
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

  // Best-effort: notifies the employee's reporting manager (in-app + email +
  // WhatsApp) that a new request is waiting on them. Silently does nothing
  // if there's no manager on file — this never blocks the request itself.
  async function notifyManagerOfRequest(title: string, body: string, category: "leave" | "regularization" | "asset") {
    if (!employee?.reportingManagerId) return;
    try {
      const manager = await fetchEmployeeById(employee.reportingManagerId);
      if (!manager) return;
      await notifyUser({
        userId: manager.userId ?? null, email: manager.email, phone: manager.mobileNumber,
        title, body, link: "/ess", category,
      });
    } catch { /* best-effort */ }
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
      notifyManagerOfRequest(
        "New leave request",
        `${employee.fullName} requested ${data.leaveType} leave from ${data.fromDate} to ${data.toDate}.`,
        "leave"
      );
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

  async function requestCorrection(data: EssRegularizationApplySchema) {
    if (!employee || !user) return { error: "No employee profile is linked to your account yet. Contact HR." };
    try {
      const r = await createRegularizationRequest({
        ...data,
        employeeId:   employee.id,
        employeeName: employee.fullName,
        officeId:     employee.officeId,
      }, user.uid);
      setRegularizations((p) => [r, ...p]);
      notifyManagerOfRequest(
        "New attendance correction request",
        `${employee.fullName} requested a correction for ${data.date}.`,
        "regularization"
      );
      return { error: null };
    } catch {
      return { error: "Failed to submit correction request" };
    }
  }

  async function requestAsset(data: EssAssetRequestSchema) {
    if (!employee || !user) return { error: "No employee profile is linked to your account yet. Contact HR." };
    try {
      const r = await createAssetRequest({
        ...data,
        employeeId:   employee.id,
        employeeName: employee.fullName,
        officeId:     employee.officeId,
      }, user.uid);
      setAssetRequests((p) => [r, ...p]);
      notifyManagerOfRequest(
        "New asset request",
        `${employee.fullName} requested ${data.assetCategory}.`,
        "asset"
      );
      return { error: null };
    } catch {
      return { error: "Failed to submit asset request" };
    }
  }

  async function reportIssue(data: EssTicketReportSchema) {
    if (!employee || !user) return { error: "No employee profile is linked to your account yet. Contact HR." };
    try {
      const t = await createTicket({
        ...data,
        reportedById:   employee.id,
        reportedByName: employee.fullName,
        officeId:       employee.officeId,
      }, user.uid);
      setMyTickets((p) => [t, ...p]);
      return { error: null };
    } catch {
      return { error: "Failed to report issue" };
    }
  }

  async function notifyRequesterOfDecision(employeeId: string, title: string, body: string, category: "leave" | "regularization" | "asset") {
    try {
      const requester = await fetchEmployeeById(employeeId);
      if (!requester) return;
      await notifyUser({
        userId: requester.userId ?? null, email: requester.email, phone: requester.mobileNumber,
        title, body, link: "/ess", category,
      });
    } catch { /* best-effort */ }
  }

  async function decideInboxItem(item: InboxItem, decision: "approve" | "reject") {
    if (!user) return { error: "Not signed in" };
    const verb = decision === "approve" ? "approved" : "rejected";
    try {
      if (item.kind === "leave") {
        if (decision === "approve") await approveLeaveRequest(item.id, user.uid);
        else await rejectLeaveRequest(item.id, user.uid);
        setTeamLeaves((p) => p.filter((l) => l.id !== item.id));
        notifyRequesterOfDecision(item.leave.employeeId, `Your leave request was ${verb}`,
          `Your ${item.leave.leaveType} leave from ${item.leave.fromDate} to ${item.leave.toDate} was ${verb}.`, "leave");
      } else if (item.kind === "regularization") {
        if (decision === "approve") await approveRegularization(item.id, user.uid);
        else await rejectRegularization(item.id, user.uid);
        setTeamRegularizations((p) => p.filter((r) => r.id !== item.id));
        notifyRequesterOfDecision(item.regularization.employeeId, `Your attendance correction was ${verb}`,
          `Your correction request for ${item.regularization.date} was ${verb}.`, "regularization");
      } else {
        if (decision === "approve") await approveAssetRequest(item.id, user.uid);
        else await rejectAssetRequest(item.id, user.uid);
        setTeamAssetRequests((p) => p.filter((r) => r.id !== item.id));
        notifyRequesterOfDecision(item.assetRequest.employeeId, `Your asset request was ${verb}`,
          `Your request for ${item.assetRequest.assetCategory} was ${verb}.`, "asset");
      }
      return { error: null };
    } catch {
      return { error: "Failed to record decision" };
    }
  }

  return {
    loading, employee, directReports, attendance, leaves, regularizations, teamInbox,
    holidays, payroll, activity, myAssets, assetRequests, myTickets,
    today, todayRecord, isClockedIn, isClockedOut, isOnBreak, leaveBalances,
    leavePolicy, enabledLeaveTypes,
    clockIn, clockOut, startBreak, endBreak, applyLeave, cancelMyLeave,
    requestCorrection, requestAsset, reportIssue, decideInboxItem, reload: load,
  };
}
