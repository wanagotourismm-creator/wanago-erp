"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { fetchEmployeeByUserId, fetchEmployeeById } from "@/modules/hrms/employees/services/employee.service";
import { fetchAttendanceByEmployee, uploadAttendanceSelfie, updateAttendanceRecord } from "@/modules/hrms/attendance/services/attendance.service";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import { fetchAttendancePolicy, DEFAULT_ATTENDANCE_POLICY, type AttendancePolicy } from "@/modules/attendancepolicy/services/attendance-policy.service";
import { getCurrentPosition, reverseGeocode, distanceMeters } from "@/lib/geo";
import { notifyUser } from "@/lib/notify";
import { auth } from "@/lib/firebase/client";
import { todayIST } from "@/lib/utils/helpers";
import type { AttendanceRecord, Employee } from "@/modules/hrms/shared/types";
import type { Office } from "@/modules/admin/offices/types";
import type { CheckInContext } from "@/modules/ess/hooks/useEss";

const todayStr = todayIST;

// A trimmed mirror of useEss.ts's clock-in/out slice — same server route,
// same fraud checks, same geofence/selfie/approval rules — but loading only
// what a clock widget needs (employee/attendance/office/policy) instead of
// useEss's full ESS-page fetch (leaves, payroll, tickets, team inbox, etc).
// Exists so the Dashboard can offer Check In/Out without every dashboard
// mount paying for the rest of useEss's Promise.all. If the clock-in rules
// themselves ever change, mirror the change in both places — see
// useEss.ts's clockIn/clockOut for the source of truth.
async function postAttendanceClock(body: Record<string, unknown>): Promise<{ hoursWorked?: number | null; pendingApproval?: boolean; distanceMeters?: number | null }> {
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

export function useQuickClock() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendancePolicy, setAttendancePolicy] = useState<AttendancePolicy>(DEFAULT_ATTENDANCE_POLICY);
  const [office, setOffice] = useState<Office | null>(null);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const [emp, policy] = await Promise.all([
        fetchEmployeeByUserId(user.uid, user.email),
        fetchAttendancePolicy(),
      ]);
      setEmployee(emp);
      setAttendancePolicy(policy);
      if (emp) {
        const [att, offices] = await Promise.all([
          fetchAttendanceByEmployee(emp.id),
          fetchOffices(),
        ]);
        setAttendance(att);
        setOffice(offices.find((o) => o.id === emp.officeId) ?? null);
      }
    } catch {
      // Best-effort widget — the full ESS page (My HR) surfaces load
      // failures properly; this one just quietly stays in its empty state
      // rather than showing an error banner on every dashboard variant.
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
  const forgottenCheckout = attendance.find((a) => a.date !== today && !!a.clockIn && !a.clockOut) ?? null;

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
      requiresSelfie: geofenceConfigured && (!pos || withinGeofence === false),
    };
  }

  async function notifyEmployeeManager(managerId: string | null | undefined, title: string, body: string, category: "location") {
    if (!managerId) return;
    try {
      const manager = await fetchEmployeeById(managerId);
      if (!manager) return;
      await notifyUser({
        userId: manager.userId ?? null, email: manager.email, phone: manager.mobileNumber,
        title, body, link: "/ess?section=approvals", category,
      });
    } catch { /* best-effort */ }
  }

  function notifyManagerOfLocationRequest(body: string) {
    const title = "Attendance needs location approval";
    notifyEmployeeManager(employee?.reportingManagerId, title, body, "location");
    if (employee?.functionalManagerId && employee.functionalManagerId !== employee.reportingManagerId) {
      notifyEmployeeManager(employee.functionalManagerId, title, body, "location");
    }
  }

  async function clockIn(ctx: CheckInContext, selfieFile: File | null, lateReason?: string | null) {
    if (!employee || !user) return { error: "No employee profile is linked to your account yet. Contact HR." };
    try {
      // No client-side suspicion pre-check here (deliberately removed) —
      // /api/hrms/attendance/clock's checkAndBlockSuspicious is now the
      // ONLY place a flag gets logged, since it also suspends the account
      // and notifies the manager. A client-side duplicate that only
      // blocked+logged (no suspend, no manager notice) would mean a normal
      // UI flow got the weaker response and only a raw API call got the
      // real one — backwards from what a bypass-resistant check should do.
      const outOfRange = ctx.requiresSelfie;
      let selfieUrl: string | null = null;
      if (outOfRange) {
        if (!selfieFile) return { error: "A selfie is required to check in from outside the office." };
        selfieUrl = await uploadAttendanceSelfie(employee.id, today, "check_in", selfieFile);
      }

      const res = await postAttendanceClock({
        type: "in",
        employeeId: employee.id,
        clockInLat: ctx.pos?.lat ?? null, clockInLng: ctx.pos?.lng ?? null, clockInAccuracy: ctx.pos?.accuracy ?? null,
        clockInAddress: ctx.address,
        clockInSelfieUrl: selfieUrl,
        lateReason: lateReason || null,
      });
      await load();

      const pendingApproval = !!res.pendingApproval;
      if (pendingApproval) {
        const km = res.distanceMeters != null ? (res.distanceMeters / 1000).toFixed(1) : "an unknown distance";
        notifyManagerOfLocationRequest(`${employee.fullName} checked in ${km} km from ${ctx.officeName} and needs approval.`);
      }
      return { error: null, pendingApproval };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to clock in" };
    }
  }

  async function clockOut(ctx: CheckInContext, selfieFile: File | null) {
    if (!todayRecord) return { error: "You haven't clocked in today" };
    try {
      const outOfRange = ctx.requiresSelfie;
      let selfieUrl: string | null = null;
      if (outOfRange) {
        if (!selfieFile) return { error: "A selfie is required to check out from outside the office." };
        selfieUrl = await uploadAttendanceSelfie(employee?.id ?? "unknown", today, "check_out", selfieFile);
      }

      const res = await postAttendanceClock({
        type: "out",
        recordId: todayRecord.id, employeeId: employee?.id,
        clockOutLat: ctx.pos?.lat ?? null, clockOutLng: ctx.pos?.lng ?? null, clockOutAccuracy: ctx.pos?.accuracy ?? null,
        clockOutAddress: ctx.address,
        clockOutSelfieUrl: selfieUrl,
      });
      await load();

      const pendingApproval = !!res.pendingApproval;
      if (pendingApproval && employee) {
        const km = res.distanceMeters != null ? (res.distanceMeters / 1000).toFixed(1) : "an unknown distance";
        notifyManagerOfLocationRequest(`${employee.fullName} checked out ${km} km from ${ctx.officeName} and needs approval.`);
      }
      return { error: null, pendingApproval };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to clock out" };
    }
  }

  async function startBreak() {
    if (!todayRecord) return { error: "Clock in first" };
    try {
      await updateAttendanceRecord(todayRecord.id, { breakStartTime: new Date().toTimeString().slice(0, 5) });
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
      const nowTime = new Date().toTimeString().slice(0, 5);
      const [nh, nm] = nowTime.split(":").map(Number);
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

  return {
    loading, employee, attendance, attendancePolicy, todayRecord,
    isClockedIn, isClockedOut, isOnBreak, forgottenCheckout,
    clockIn, clockOut, resolveCheckInContext, startBreak, endBreak,
  };
}
