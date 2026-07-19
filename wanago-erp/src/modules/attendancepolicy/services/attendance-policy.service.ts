import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export type AttendancePolicy = {
  workStartTime:      string; // "HH:mm", office start time
  workEndTime:        string; // "HH:mm", office end time
  gracePeriodMinutes: number; // minutes after workStartTime before a check-in counts as late
  halfDayHours:       number; // hoursWorked below this counts as a half day
  fullDayHours:       number; // hoursWorked at/above this counts as a full day
  breakAllowanceMinutes: number; // total break time (e.g. lunch + tea) shown/tracked per day
  lateReasonRequired:    boolean; // prompt for a written reason when checking in past the grace period
};

const DOC_ID = "attendancePolicy";

// Matches the company's official Attendance Policy (HR-ATT-001): office
// hours 10:00 AM-6:00 PM, a 5-minute grace period since employees reporting
// after 10:05 AM must submit a written explanation, and a 1h05m break
// allowance (Lunch 45m + Tea 20m).
export const DEFAULT_ATTENDANCE_POLICY: AttendancePolicy = {
  workStartTime:      "10:00",
  workEndTime:        "18:00",
  gracePeriodMinutes: 5,
  halfDayHours:       4,
  fullDayHours:       8,
  breakAllowanceMinutes: 65,
  lateReasonRequired:    true,
};

export async function fetchAttendancePolicy(): Promise<AttendancePolicy> {
  const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, DOC_ID));
  if (!snap.exists()) return DEFAULT_ATTENDANCE_POLICY;
  const data = snap.data() as Partial<AttendancePolicy>;
  return { ...DEFAULT_ATTENDANCE_POLICY, ...data };
}

export async function updateAttendancePolicy(data: AttendancePolicy, updatedBy: string): Promise<void> {
  await setDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, DOC_ID), {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy,
  }, { merge: true });
}

// clockIn/workStartTime are both "HH:mm" — a record is late once it's past
// the start time plus the grace period. Returns false for a missing
// clock-in (nothing to flag yet).
export function isLateArrival(clockIn: string | null | undefined, policy: AttendancePolicy): boolean {
  if (!clockIn) return false;
  const [inH, inM] = clockIn.split(":").map(Number);
  const [startH, startM] = policy.workStartTime.split(":").map(Number);
  const inMinutes = inH * 60 + inM;
  const cutoffMinutes = startH * 60 + startM + policy.gracePeriodMinutes;
  return inMinutes > cutoffMinutes;
}

// A checkout before the office's end time counts as leaving early.
export function isEarlyDeparture(clockOut: string | null | undefined, policy: AttendancePolicy): boolean {
  if (!clockOut) return false;
  const [outH, outM] = clockOut.split(":").map(Number);
  const [endH, endM] = policy.workEndTime.split(":").map(Number);
  return (outH * 60 + outM) < (endH * 60 + endM);
}
