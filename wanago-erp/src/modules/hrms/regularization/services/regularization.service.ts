import { orderBy, where, serverTimestamp } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { fetchAttendanceForDate, createAttendanceRecord, updateAttendanceRecord } from "@/modules/hrms/attendance/services/attendance.service";
import type { AttendanceRegularization } from "@/modules/hrms/shared/types";
import type { RegularizationRequestSchema } from "@/modules/hrms/regularization/schemas";

class RegularizationRepository extends BaseRepository<AttendanceRegularization> {
  constructor() { super(FIRESTORE_COLLECTIONS.HRMS_REGULARIZATIONS); }
}
const repo = new RegularizationRepository();

export async function fetchRegularizations(): Promise<AttendanceRegularization[]> {
  return repo.findMany({ constraints: [orderBy("createdAt", "desc")] });
}

export async function fetchRegularizationsByEmployee(employeeId: string): Promise<AttendanceRegularization[]> {
  return repo.findMany({ constraints: [where("employeeId", "==", employeeId), orderBy("createdAt", "desc")] });
}

export async function createRegularizationRequest(data: RegularizationRequestSchema, createdBy: string): Promise<AttendanceRegularization> {
  return repo.create({
    ...data,
    requestedClockIn:  data.requestedClockIn || null,
    requestedClockOut: data.requestedClockOut || null,
    regularizationStatus: "pending",
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    comments:   null,
    status:     "active",
    createdBy,
  });
}

export async function approveRegularization(id: string, approvedBy: string): Promise<void> {
  const reg = await repo.findById(id);
  if (!reg) throw new Error("Request not found");

  const existing = await fetchAttendanceForDate(reg.employeeId, reg.date);
  if (existing) {
    await updateAttendanceRecord(existing.id, {
      status:   "present",
      clockIn:  reg.requestedClockIn  || existing.clockIn  || "",
      clockOut: reg.requestedClockOut || existing.clockOut || "",
    });
  } else {
    await createAttendanceRecord({
      employeeId: reg.employeeId, employeeName: reg.employeeName, date: reg.date,
      status: "present", clockIn: reg.requestedClockIn || "", clockOut: reg.requestedClockOut || "",
      notes: "Added via attendance correction request", officeId: reg.officeId,
    }, approvedBy);
  }

  await repo.update(id, {
    regularizationStatus: "approved",
    approvedBy,
    approvedAt: serverTimestamp(),
    rejectedBy: null,
  });
}

export async function rejectRegularization(id: string, rejectedBy: string, comments?: string): Promise<void> {
  return repo.update(id, {
    regularizationStatus: "rejected",
    rejectedBy,
    approvedBy: null,
    approvedAt: null,
    comments: comments || null,
  });
}

export async function deleteRegularization(id: string): Promise<void> {
  return repo.delete(id);
}
