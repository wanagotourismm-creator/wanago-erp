import { orderBy, where, getDocs, query, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { AttendanceRecord } from "@/modules/hrms/shared/types";
import type { AttendanceRecordSchema } from "@/modules/hrms/attendance/schemas";

class AttendanceRepository extends BaseRepository<AttendanceRecord> {
  constructor() { super(FIRESTORE_COLLECTIONS.HRMS_CHECK_INS); }
}
const repo = new AttendanceRepository();

function calcHours(clockIn?: string, clockOut?: string, breakMinutes = 0): number | null {
  if (!clockIn || !clockOut) return null;
  const [inH, inM] = clockIn.split(":").map(Number);
  const [outH, outM] = clockOut.split(":").map(Number);
  let minutes = (outH * 60 + outM) - (inH * 60 + inM);
  // Overnight shift (e.g. clockIn 22:00, clockOut 06:00) — clockOut's
  // time-of-day is numerically earlier than clockIn's, so the raw
  // subtraction goes negative even though the employee worked a real,
  // positive duration overnight. Previously this fell straight through to
  // the minutes<=0 check below and the shift was recorded as
  // hoursWorked: null. Assume a single midnight crossing.
  if (minutes < 0) minutes += 24 * 60;
  minutes -= breakMinutes;
  if (minutes <= 0) return null;
  return Math.round((minutes / 60) * 100) / 100;
}

export async function fetchAttendanceRecords(): Promise<AttendanceRecord[]> {
  return repo.findMany({ constraints: [orderBy("date", "desc")] });
}

export async function fetchAttendanceByEmployee(employeeId: string): Promise<AttendanceRecord[]> {
  return repo.findMany({ constraints: [where("employeeId", "==", employeeId), orderBy("date", "desc")] });
}

async function attendanceExists(employeeId: string, date: string): Promise<boolean> {
  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.HRMS_CHECK_INS),
    where("employeeId", "==", employeeId),
    where("date", "==", date),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function fetchAttendanceForDate(employeeId: string, date: string): Promise<AttendanceRecord | null> {
  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.HRMS_CHECK_INS),
    where("employeeId", "==", employeeId),
    where("date", "==", date),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as AttendanceRecord;
}

// A selfie is captured (front camera, via the browser's native camera
// capture rather than a live getUserMedia preview — matches how receipts
// and profile photos are already captured elsewhere in this app) before
// the attendance record it belongs to exists yet, so it's uploaded
// straight to a path keyed by employee/date/action rather than the
// record's own id.
export async function uploadAttendanceSelfie(
  employeeId: string, date: string, action: "check_in" | "check_out", file: File
): Promise<string> {
  const storageRef = ref(storage, `attendance-selfies/${employeeId}/${date}-${action}-${Date.now()}-${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function createAttendanceRecord(data: AttendanceRecordSchema, createdBy: string): Promise<AttendanceRecord> {
  const exists = await attendanceExists(data.employeeId, data.date);
  if (exists) throw new Error("Attendance already marked for this employee on this date");

  return repo.create({
    ...data,
    clockIn:     data.clockIn || null,
    clockOut:    data.clockOut || null,
    hoursWorked: calcHours(data.clockIn, data.clockOut, data.breakMinutes ?? 0),
    notes:       data.notes || null,
    breakStartTime: data.breakStartTime || null,
    breakMinutes:   data.breakMinutes ?? 0,
    clockInLat:     data.clockInLat ?? null,
    clockInLng:     data.clockInLng ?? null,
    withinGeofence: data.withinGeofence ?? null,
    clockOutLat:       data.clockOutLat ?? null,
    clockOutLng:       data.clockOutLng ?? null,
    withinGeofenceOut: data.withinGeofenceOut ?? null,
    clockInSelfieUrl:  data.clockInSelfieUrl ?? null,
    clockOutSelfieUrl: data.clockOutSelfieUrl ?? null,
    clockInAddress:    data.clockInAddress ?? null,
    clockOutAddress:   data.clockOutAddress ?? null,
    distanceFromOfficeMeters: data.distanceFromOfficeMeters ?? null,
    locationApprovalStatus:   data.locationApprovalStatus ?? null,
    locationApprovedBy:       data.locationApprovedBy ?? null,
    locationApprovedAt:       null,
    createdBy,
  });
}

// Manager approves/rejects a check-in/out that was outside the office
// geofence — the pending item shows up in their Team Inbox alongside
// leave/regularization/asset requests. Approving/rejecting only updates the
// approval trail; it deliberately doesn't touch status/hoursWorked, so HR
// still sees exactly what was recorded either way and can follow up
// (e.g. via a regularization) if a rejected check-in needs correcting.
export async function decideLocationApproval(
  id: string, decision: "approved" | "rejected", decidedBy: string
): Promise<void> {
  return repo.update(id, {
    locationApprovalStatus: decision,
    locationApprovedBy: decidedBy,
    locationApprovedAt: serverTimestamp(),
  } as Partial<AttendanceRecord>);
}

export async function updateAttendanceRecord(id: string, data: Partial<AttendanceRecordSchema>): Promise<void> {
  const patch: Partial<AttendanceRecord> = { ...data };
  if (data.clockIn !== undefined) patch.clockIn = data.clockIn || null;
  if (data.clockOut !== undefined) patch.clockOut = data.clockOut || null;
  if (data.clockIn !== undefined || data.clockOut !== undefined || data.breakMinutes !== undefined) {
    const existing = await repo.findById(id);
    if (existing) {
      const clockIn  = data.clockIn  !== undefined ? data.clockIn  : (existing.clockIn ?? undefined);
      const clockOut = data.clockOut !== undefined ? data.clockOut : (existing.clockOut ?? undefined);
      const breakMinutes = data.breakMinutes !== undefined ? data.breakMinutes : (existing.breakMinutes ?? 0);
      patch.hoursWorked = calcHours(clockIn ?? undefined, clockOut ?? undefined, breakMinutes);
    }
  }
  if (data.notes !== undefined) patch.notes = data.notes || null;
  return repo.update(id, patch);
}

export async function deleteAttendanceRecord(id: string): Promise<void> {
  return repo.delete(id);
}
