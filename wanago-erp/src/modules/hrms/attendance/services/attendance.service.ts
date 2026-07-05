import { orderBy, where, getDocs, query, collection } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { AttendanceRecord } from "@/modules/hrms/shared/types";
import type { AttendanceRecordSchema } from "@/modules/hrms/attendance/schemas";

class AttendanceRepository extends BaseRepository<AttendanceRecord> {
  constructor() { super(FIRESTORE_COLLECTIONS.HRMS_CHECK_INS); }
}
const repo = new AttendanceRepository();

function calcHours(clockIn?: string, clockOut?: string): number | null {
  if (!clockIn || !clockOut) return null;
  const [inH, inM] = clockIn.split(":").map(Number);
  const [outH, outM] = clockOut.split(":").map(Number);
  const minutes = (outH * 60 + outM) - (inH * 60 + inM);
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

export async function createAttendanceRecord(data: AttendanceRecordSchema, createdBy: string): Promise<AttendanceRecord> {
  const exists = await attendanceExists(data.employeeId, data.date);
  if (exists) throw new Error("Attendance already marked for this employee on this date");

  return repo.create({
    ...data,
    clockIn:     data.clockIn || null,
    clockOut:    data.clockOut || null,
    hoursWorked: calcHours(data.clockIn, data.clockOut),
    notes:       data.notes || null,
    breakStartTime: data.breakStartTime || null,
    breakMinutes:   data.breakMinutes ?? 0,
    clockInLat:     data.clockInLat ?? null,
    clockInLng:     data.clockInLng ?? null,
    withinGeofence: data.withinGeofence ?? null,
    createdBy,
  });
}

export async function updateAttendanceRecord(id: string, data: Partial<AttendanceRecordSchema>): Promise<void> {
  const patch: Partial<AttendanceRecord> = { ...data };
  if (data.clockIn !== undefined) patch.clockIn = data.clockIn || null;
  if (data.clockOut !== undefined) patch.clockOut = data.clockOut || null;
  if (data.clockIn !== undefined || data.clockOut !== undefined) {
    const existing = await repo.findById(id);
    if (existing) {
      const clockIn  = data.clockIn  !== undefined ? data.clockIn  : (existing.clockIn ?? undefined);
      const clockOut = data.clockOut !== undefined ? data.clockOut : (existing.clockOut ?? undefined);
      patch.hoursWorked = calcHours(clockIn ?? undefined, clockOut ?? undefined);
    }
  }
  if (data.notes !== undefined) patch.notes = data.notes || null;
  return repo.update(id, patch);
}

export async function deleteAttendanceRecord(id: string): Promise<void> {
  return repo.delete(id);
}
