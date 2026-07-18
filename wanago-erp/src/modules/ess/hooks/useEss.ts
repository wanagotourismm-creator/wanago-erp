"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { fetchEmployeeByUserId, fetchEmployees, fetchEmployeeById } from "@/modules/hrms/employees/services/employee.service";
import { fetchAttendanceByEmployee, fetchAttendanceRecords, updateAttendanceRecord, uploadAttendanceSelfie, decideLocationApproval } from "@/modules/hrms/attendance/services/attendance.service";
import { fetchLeaves, fetchLeavesByEmployee, createLeaveRequest, cancelLeaveRequest, approveLeaveRequest, rejectLeaveRequest } from "@/modules/hrms/leaves/services/leave.service";
import { fetchRegularizations, fetchRegularizationsByEmployee, createRegularizationRequest, approveRegularization, rejectRegularization } from "@/modules/hrms/regularization/services/regularization.service";
import { fetchHolidays } from "@/modules/admin/holidays/services/holiday.service";
import { fetchPayrollByEmployee } from "@/modules/hrms/payroll/services/payroll.service";
import { fetchAssetsByEmployee } from "@/modules/assets/services/asset.service";
import { fetchAssetRequests, fetchAssetRequestsByEmployee, createAssetRequest, approveAssetRequest, rejectAssetRequest } from "@/modules/assets/services/asset-request.service";
import { fetchTicketsByReporter, createTicket } from "@/modules/tickets/services/ticket.service";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import { getCurrentPosition, reverseGeocode, distanceMeters, type GeoPosition } from "@/lib/geo";
import { detectSuspiciousLocation } from "@/lib/geo-fraud";
import { logSuspiciousAttempt } from "@/modules/hrms/attendance/services/suspicious-attendance.service";
import { notifyUser } from "@/lib/notify";
import { auth } from "@/lib/firebase/client";
import { WHATSAPP_TEMPLATE_PURPOSES } from "@/lib/constants";
import { fetchLeavePolicy, DEFAULT_LEAVE_POLICY, LEAVE_TYPE_ORDER, type LeavePolicy } from "@/modules/leavepolicy/services/leave-policy.service";
import { fetchAttendancePolicy, DEFAULT_ATTENDANCE_POLICY, isLateArrival, type AttendancePolicy } from "@/modules/attendancepolicy/services/attendance-policy.service";
import { fetchRecentActivity, type ActivityLogEntry } from "@/lib/activity-log";
import { todayIST } from "@/lib/utils/helpers";
import type { Employee, AttendanceRecord, LeaveRequest, PayrollRecord, AttendanceRegularization } from "@/modules/hrms/shared/types";
import type { Asset, AssetRequest } from "@/modules/assets/types";
import type { Ticket } from "@/modules/tickets/types";
import type { Office } from "@/modules/admin/offices/types";
import type { EssLeaveApplySchema, EssRegularizationApplySchema } from "@/modules/ess/schemas";
import type { EssAssetRequestSchema } from "@/modules/assets/schemas";
import type { EssTicketReportSchema } from "@/modules/tickets/schemas";
import type { Holiday } from "@/modules/admin/holidays/types";

// Must match /api/hrms/attendance/clock's serverDateAndTime() — see
// todayIST()'s own comment for why (this used to be UTC-based here).
const todayStr = todayIST;
const nowTime  = () => new Date().toTimeString().slice(0, 5);

// Clock-in/out writes go through this server route (Firebase Admin SDK,
// see /api/hrms/attendance/clock) instead of straight to Firestore from
// the client — the server derives the date/time itself (a wrong device
// clock/timezone can no longer misrecord it) and runs the
// check-then-create/update inside one transaction (closing the race where
// two near-simultaneous check-ins could both land).
async function postAttendanceClock(body: Record<string, unknown>): Promise<{ hoursWorked?: number | null }> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error("Not signed in");
  const res = await fetch("/api/hrms/attendance/clock", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to record attendance");
  return data;
}

export const BREAK_ALLOWANCE_MINUTES = 60;

export type LeaveBalance = { type: string; entitlement: number; used: number; remaining: number };

export type InboxItem =
  | { kind: "leave"; id: string; leave: LeaveRequest }
  | { kind: "regularization"; id: string; regularization: AttendanceRegularization }
  | { kind: "asset"; id: string; assetRequest: AssetRequest }
  | { kind: "location"; id: string; attendance: AttendanceRecord };

// Resolved before clockIn/clockOut is actually called — the UI shows this
// (address, distance, whether a selfie will be required) as a confirm
// step, then passes it straight through so the position is only ever
// fetched once per attempt.
export type CheckInContext = {
  pos: GeoPosition | null;
  address: string | null;
  officeName: string;
  geofenceConfigured: boolean;
  withinGeofence: boolean | null;
  distanceMeters: number | null;
  requiresSelfie: boolean;
};

export function useEss() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [directReports, setDirectReports] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [regularizations, setRegularizations] = useState<AttendanceRegularization[]>([]);
  const [teamLeaves, setTeamLeaves] = useState<LeaveRequest[]>([]);
  const [teamRegularizations, setTeamRegularizations] = useState<AttendanceRegularization[]>([]);
  const [teamLocationApprovals, setTeamLocationApprovals] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [myAssets, setMyAssets] = useState<Asset[]>([]);
  const [assetRequests, setAssetRequests] = useState<AssetRequest[]>([]);
  const [teamAssetRequests, setTeamAssetRequests] = useState<AssetRequest[]>([]);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [office, setOffice] = useState<Office | null>(null);
  const [leavePolicy, setLeavePolicy] = useState<LeavePolicy>(DEFAULT_LEAVE_POLICY);
  const [attendancePolicy, setAttendancePolicy] = useState<AttendancePolicy>(DEFAULT_ATTENDANCE_POLICY);
  const [forgottenCheckout, setForgottenCheckout] = useState<AttendanceRecord | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [emp, hols, policy, attPolicy] = await Promise.all([
        fetchEmployeeByUserId(user.uid, user.email),
        fetchHolidays(),
        fetchLeavePolicy(),
        fetchAttendancePolicy(),
      ]);
      setEmployee(emp);
      setHolidays(hols);
      setLeavePolicy(policy);
      setAttendancePolicy(attPolicy);

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

        // No auto-checkout job runs in this project (no scheduled
        // Cloud Functions deployed), so a forgotten checkout would
        // otherwise just sit open forever with no visible sign of it.
        // Surface the most recent one (that hasn't already had a
        // correction filed for it) as a banner instead.
        const openPriorDay = att.find((a) => a.date !== todayStr() && !!a.clockIn && !a.clockOut) ?? null;
        const alreadyFiled = openPriorDay ? myRegs.some((r) => r.date === openPriorDay.date) : false;
        setForgottenCheckout(alreadyFiled ? null : openPriorDay);
        setPayroll(myPayroll);
        setActivity(recentActivity.filter((a) => a.actorId === user.uid));
        setMyAssets(empAssets);
        setAssetRequests(myAssetReqs);
        setMyTickets(myTix);
        setOffice(offices.find((o) => o.id === emp.officeId) ?? null);

        const reports = allEmployees.filter((e) => e.reportingManagerId === emp.id);
        setDirectReports(reports);

        // Location approvals additionally include this manager's
        // functional reports (matches isOwnerOrEitherManagerOfEmployee in
        // firestore.rules) — a functional manager with zero direct reports
        // would otherwise never see a pending request land in their inbox,
        // even though notifyManagerOfLocationRequest already emails/pings
        // them about it. Leave/regularization/asset stay reporting-only.
        const functionalReports = allEmployees.filter((e) => e.functionalManagerId === emp.id);
        const locationReportIds = new Set([...reports, ...functionalReports].map((r) => r.id));

        if (reports.length > 0 || functionalReports.length > 0) {
          const reportIds = new Set(reports.map((r) => r.id));
          const [allLeaves, allRegs, allAssetReqs, allAttendance] = await Promise.all([
            fetchLeaves(), fetchRegularizations(), fetchAssetRequests(), fetchAttendanceRecords(),
          ]);
          setTeamLeaves(allLeaves.filter((l) => reportIds.has(l.employeeId) && l.status === "pending"));
          setTeamRegularizations(allRegs.filter((r) => reportIds.has(r.employeeId) && r.regularizationStatus === "pending"));
          setTeamAssetRequests(allAssetReqs.filter((r) => reportIds.has(r.employeeId) && r.requestStatus === "pending"));
          setTeamLocationApprovals(allAttendance.filter((a) => locationReportIds.has(a.employeeId) && a.locationApprovalStatus === "pending"));
        } else {
          setTeamLeaves([]);
          setTeamRegularizations([]);
          setTeamAssetRequests([]);
          setTeamLocationApprovals([]);
        }
      }
    } catch (e) {
      // A missing Firestore composite index (or any other load failure) used
      // to fail this Promise.all silently, leaving attendance/leaves/etc in
      // their empty initial state — which made check-in look "already done"
      // as far as Firestore was concerned while the UI still showed the
      // "Check In" button. Surface it instead of swallowing it.
      setLoadError(e instanceof Error ? e.message : "Failed to load your HR data. Please try again.");
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
    ...teamLocationApprovals.map((a): InboxItem => ({ kind: "location", id: a.id, attendance: a })),
  ];

  // Runs the location-spoofing heuristics (impossible travel speed,
  // suspiciously perfect GPS accuracy, identical coordinates repeated across
  // days) against this employee's own attendance history and, if anything
  // trips, logs a review entry for HR before returning a block reason. A
  // browser can't ask "is this GPS mocked" the way a native app can, so this
  // is pattern-matching, not proof — that's why it's logged for a human to
  // review rather than treated as an automatic disciplinary action.
  async function checkAndLogSuspicion(pos: GeoPosition, action: "check_in" | "check_out"): Promise<string | null> {
    if (!employee || !user) return null;
    const recentRecords = attendance.filter((r) => r.date !== today);
    const reasons = detectSuspiciousLocation({ pos, action, recentRecords });
    if (reasons.length === 0) return null;

    logSuspiciousAttempt({
      employeeId: employee.id,
      employeeName: employee.fullName,
      officeId: employee.officeId,
      officeName: office?.name ?? "",
      action,
      lat: pos.lat,
      lng: pos.lng,
      accuracy: pos.accuracy,
      reasons,
    }, user.uid).catch(() => { /* logging the flag must never crash the block itself */ });

    return "We couldn't verify your location for this attempt, so it's been blocked and flagged for HR review. If this is a mistake, contact HR or submit an attendance correction.";
  }

  // Fetches location + reverse-geocodes it + checks it against the office's
  // geofence (if configured) in one shot — the UI calls this first to show
  // an address/map confirm step and decide whether to prompt for a selfie,
  // then passes the resolved context straight into clockIn/clockOut so the
  // position is only ever read from the device once per attempt.
  async function resolveCheckInContext(): Promise<CheckInContext> {
    const pos = await getCurrentPosition();
    const address = pos ? await reverseGeocode(pos.lat, pos.lng) : null;
    const geofenceConfigured =
      office?.latitude != null && office?.longitude != null && office?.geofenceRadiusMeters != null;

    let withinGeofence: boolean | null = null;
    let distance: number | null = null;
    if (geofenceConfigured && pos) {
      distance = distanceMeters(pos.lat, pos.lng, office!.latitude!, office!.longitude!);
      withinGeofence = distance <= office!.geofenceRadiusMeters!;
    }

    return {
      pos, address, officeName: office?.name ?? "the office",
      geofenceConfigured, withinGeofence, distanceMeters: distance,
      // A selfie (and the manager-approval it triggers) is only ever
      // needed for a geofenced office, and only when the employee is
      // confirmed outside it or couldn't be located at all — being within
      // range, or an office that never opted into geofencing, needs
      // neither.
      requiresSelfie: geofenceConfigured && (!pos || withinGeofence === false),
    };
  }

  async function clockIn(ctx: CheckInContext, selfieFile: File | null) {
    if (!employee || !user) return { error: "No employee profile is linked to your account yet. Contact HR." };
    try {
      if (ctx.geofenceConfigured && !ctx.pos) {
        return { error: "This office requires location access to clock in. Please enable location permissions for this site and try again." };
      }

      if (ctx.pos) {
        const blockReason = await checkAndLogSuspicion(ctx.pos, "check_in");
        if (blockReason) return { error: blockReason };
      }

      const outOfRange = ctx.requiresSelfie;
      let selfieUrl: string | null = null;
      if (outOfRange) {
        if (!selfieFile) return { error: "A selfie is required to check in from outside the office." };
        selfieUrl = await uploadAttendanceSelfie(employee.id, today, "check_in", selfieFile);
      }

      await postAttendanceClock({
        type: "in",
        employeeId: employee.id, employeeName: employee.fullName,
        officeId: employee.officeId,
        clockInLat: ctx.pos?.lat ?? null, clockInLng: ctx.pos?.lng ?? null, withinGeofence: ctx.withinGeofence,
        clockInAddress: ctx.address,
        clockInSelfieUrl: selfieUrl,
        distanceFromOfficeMeters: outOfRange ? ctx.distanceMeters : null,
        locationApprovalStatus: outOfRange ? "pending" : null,
      });
      await load();

      if (outOfRange) {
        const km = ctx.distanceMeters != null ? (ctx.distanceMeters / 1000).toFixed(1) : "an unknown distance";
        notifyManagerOfLocationRequest(`${employee.fullName} checked in ${km} km from ${ctx.officeName} and needs approval.`);
      }
      return { error: null, pendingApproval: outOfRange };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to clock in" };
    }
  }

  async function clockOut(ctx: CheckInContext, selfieFile: File | null) {
    if (!todayRecord) return { error: "You haven't clocked in today" };
    try {
      if (ctx.geofenceConfigured && !ctx.pos) {
        return { error: "This office requires location access to clock out. Please enable location permissions for this site and try again." };
      }

      if (ctx.pos) {
        const blockReason = await checkAndLogSuspicion(ctx.pos, "check_out");
        if (blockReason) return { error: blockReason };
      }

      const outOfRange = ctx.requiresSelfie;
      let selfieUrl: string | null = null;
      if (outOfRange) {
        if (!selfieFile) return { error: "A selfie is required to check out from outside the office." };
        selfieUrl = await uploadAttendanceSelfie(employee?.id ?? "unknown", today, "check_out", selfieFile);
      }

      await postAttendanceClock({
        type: "out",
        recordId: todayRecord.id, employeeId: employee?.id,
        clockOutLat: ctx.pos?.lat ?? null,
        clockOutLng: ctx.pos?.lng ?? null,
        withinGeofenceOut: ctx.withinGeofence,
        clockOutAddress: ctx.address,
        clockOutSelfieUrl: selfieUrl,
        distanceFromOfficeMeters: outOfRange ? ctx.distanceMeters : todayRecord.distanceFromOfficeMeters,
        locationApprovalStatus: outOfRange ? "pending" : todayRecord.locationApprovalStatus,
      });
      await load();

      if (outOfRange && employee) {
        const km = ctx.distanceMeters != null ? (ctx.distanceMeters / 1000).toFixed(1) : "an unknown distance";
        notifyManagerOfLocationRequest(`${employee.fullName} checked out ${km} km from ${ctx.officeName} and needs approval.`);
      }
      return { error: null, pendingApproval: outOfRange };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to clock out" };
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

  // Best-effort: notifies one specific manager (in-app + email + WhatsApp)
  // that a new request is waiting on them. Silently does nothing if the id
  // is missing or doesn't resolve to a real employee — this never blocks
  // the request itself.
  async function notifyEmployeeManager(managerId: string | null | undefined, title: string, body: string, category: "leave" | "regularization" | "asset" | "location") {
    if (!managerId) return;
    try {
      const manager = await fetchEmployeeById(managerId);
      if (!manager) return;
      await notifyUser({
        userId: manager.userId ?? null, email: manager.email, phone: manager.mobileNumber,
        title, body, link: "/ess", category,
      });
    } catch { /* best-effort */ }
  }

  // Leaves/regularizations/assets stay reporting-manager-only — see
  // functionalManagerId's own comment in hrms/shared/types.ts for why.
  async function notifyManagerOfRequest(title: string, body: string, category: "leave" | "regularization" | "asset" | "location") {
    await notifyEmployeeManager(employee?.reportingManagerId, title, body, category);
  }

  // Location-approval requests specifically go to BOTH the reporting
  // manager and the functional manager (unlike leave/regularization/asset,
  // which stay reporting-manager-only) — skips the second notification
  // when they're the same person.
  function notifyManagerOfLocationRequest(body: string) {
    const title = "Attendance needs location approval";
    notifyEmployeeManager(employee?.reportingManagerId, title, body, "location");
    if (employee?.functionalManagerId && employee.functionalManagerId !== employee.reportingManagerId) {
      notifyEmployeeManager(employee.functionalManagerId, title, body, "location");
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
      notifyManagerOfRequest(
        "New leave request",
        `${employee.fullName} requested ${data.leaveType} leave from ${data.fromDate} to ${data.toDate}.`,
        "leave"
      );
      return { error: null };
    } catch (e) {
      // Surface the specific reason (e.g. the new overlap-detection error
      // from createLeaveRequest) instead of a generic message.
      return { error: e instanceof Error ? e.message : "Failed to submit leave request" };
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

  const DECISION_CATEGORY_LABELS: Record<"leave" | "regularization" | "asset" | "location", string> = {
    leave: "leave", regularization: "attendance correction", asset: "asset", location: "check-in/out location",
  };

  async function notifyRequesterOfDecision(
    employeeId: string, title: string, body: string,
    category: "leave" | "regularization" | "asset" | "location", decision: "approve" | "reject"
  ) {
    try {
      const requester = await fetchEmployeeById(employeeId);
      if (!requester) return;
      // Leave gets its own mood-aware email (see sendLeaveDecisionEmailFor)
      // sent separately — skip the generic one here so the requester
      // doesn't get two emails for the same decision.
      await notifyUser({
        userId: requester.userId ?? null, email: category === "leave" ? null : requester.email, phone: requester.mobileNumber,
        whatsappPurpose: WHATSAPP_TEMPLATE_PURPOSES.STAFF_REQUEST_DECISION,
        whatsappVariables: [DECISION_CATEGORY_LABELS[category], decision === "approve" ? "approved" : "rejected"],
        title, body, link: "/ess", category,
      });
    } catch { /* best-effort */ }
  }

  // Sick leave gets a "take care and rest" message + a wellness quote;
  // every other leave type gets an "enjoy your day" message + a travel
  // quote; rejections get a gentler, quote-free-of-celebration note —
  // richer than the generic notifyUser email, so it's sent on its own.
  async function sendLeaveDecisionEmailFor(leave: LeaveRequest, decision: "approve" | "reject") {
    try {
      const requester = await fetchEmployeeById(leave.employeeId);
      if (!requester?.email) return;
      const idToken = await auth.currentUser?.getIdToken().catch(() => null);
      await fetch("/api/hrms/send-leave-decision-email", {
        method: "POST",
        headers: { "content-type": "application/json", ...(idToken ? { authorization: `Bearer ${idToken}` } : {}) },
        body: JSON.stringify({
          to: requester.email, fullName: requester.fullName, leaveType: leave.leaveType,
          fromDate: leave.fromDate, toDate: leave.toDate, decision,
        }),
      });
    } catch { /* best-effort */ }
  }

  async function decideInboxItem(item: InboxItem, decision: "approve" | "reject", reason?: string) {
    if (!user) return { error: "Not signed in" };
    if (decision === "reject" && !reason?.trim()) {
      return { error: "Please provide a reason for rejecting this request." };
    }
    const verb = decision === "approve" ? "approved" : "rejected";
    const reasonSuffix = decision === "reject" && reason ? ` Reason: "${reason.trim()}"` : "";
    try {
      if (item.kind === "leave") {
        if (decision === "approve") await approveLeaveRequest(item.id, user.uid);
        else await rejectLeaveRequest(item.id, user.uid, { comments: reason?.trim() });
        setTeamLeaves((p) => p.filter((l) => l.id !== item.id));
        notifyRequesterOfDecision(item.leave.employeeId, `Your leave request was ${verb}`,
          `Your ${item.leave.leaveType} leave from ${item.leave.fromDate} to ${item.leave.toDate} was ${verb}.${reasonSuffix}`, "leave", decision);
        sendLeaveDecisionEmailFor(item.leave, decision);
      } else if (item.kind === "regularization") {
        if (decision === "approve") await approveRegularization(item.id, user.uid);
        else await rejectRegularization(item.id, user.uid, reason?.trim());
        setTeamRegularizations((p) => p.filter((r) => r.id !== item.id));
        notifyRequesterOfDecision(item.regularization.employeeId, `Your attendance correction was ${verb}`,
          `Your correction request for ${item.regularization.date} was ${verb}.${reasonSuffix}`, "regularization", decision);
      } else if (item.kind === "asset") {
        if (decision === "approve") await approveAssetRequest(item.id, user.uid);
        else await rejectAssetRequest(item.id, user.uid, reason?.trim());
        setTeamAssetRequests((p) => p.filter((r) => r.id !== item.id));
        notifyRequesterOfDecision(item.assetRequest.employeeId, `Your asset request was ${verb}`,
          `Your request for ${item.assetRequest.assetCategory} was ${verb}.${reasonSuffix}`, "asset", decision);
      } else {
        await decideLocationApproval(item.id, decision === "approve" ? "approved" : "rejected", user.uid, reason?.trim());
        setTeamLocationApprovals((p) => p.filter((a) => a.id !== item.id));
        const km = item.attendance.distanceFromOfficeMeters != null
          ? (item.attendance.distanceFromOfficeMeters / 1000).toFixed(1) + " km" : "an unknown distance";
        notifyRequesterOfDecision(item.attendance.employeeId, `Your check-in/out location was ${verb}`,
          `Your attendance from ${km} away from the office on ${item.attendance.date} was ${verb}.${reasonSuffix}`, "location", decision);
      }
      return { error: null };
    } catch (e) {
      // Surface the specific reason (e.g. leave-balance/overlap rejection
      // from approveLeaveRequest) instead of a generic message, so the
      // manager knows why the decision didn't go through.
      return { error: e instanceof Error ? e.message : "Failed to record decision" };
    }
  }

  return {
    loading, loadError, employee, directReports, attendance, leaves, regularizations, teamInbox,
    holidays, payroll, activity, myAssets, assetRequests, myTickets,
    today, todayRecord, isClockedIn, isClockedOut, isOnBreak, leaveBalances,
    leavePolicy, enabledLeaveTypes, attendancePolicy, forgottenCheckout,
    clockIn, clockOut, resolveCheckInContext, startBreak, endBreak, applyLeave, cancelMyLeave,
    requestCorrection, requestAsset, reportIssue, decideInboxItem, reload: load,
  };
}
