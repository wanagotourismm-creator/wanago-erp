import { orderBy, where, serverTimestamp } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { LeaveRequest } from "@/modules/hrms/shared/types";
import type { LeaveRequestSchema, LeaveDecisionSchema } from "@/modules/hrms/leaves/schemas";

class LeaveRepository extends BaseRepository<LeaveRequest> {
  constructor() { super(FIRESTORE_COLLECTIONS.HRMS_LEAVES); }
}
const repo = new LeaveRepository();

function calcDays(fromDate: string, toDate: string): number {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const diff = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

export async function fetchLeaves(): Promise<LeaveRequest[]> {
  return repo.findMany({ constraints: [orderBy("createdAt", "desc")] });
}

export async function fetchLeavesByEmployee(employeeId: string): Promise<LeaveRequest[]> {
  return repo.findMany({ constraints: [where("employeeId", "==", employeeId), orderBy("createdAt", "desc")] });
}

export async function fetchLeaveById(id: string): Promise<LeaveRequest | null> {
  return repo.findById(id);
}

export async function createLeaveRequest(data: LeaveRequestSchema, createdBy: string): Promise<LeaveRequest> {
  return repo.create({
    ...data,
    days:       calcDays(data.fromDate, data.toDate),
    status:     "pending",
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    comments:   null,
    createdBy,
  });
}

export async function updateLeaveRequest(id: string, data: Partial<LeaveRequestSchema>): Promise<void> {
  const patch: Partial<LeaveRequest> = { ...data };
  if (data.fromDate && data.toDate) {
    patch.days = calcDays(data.fromDate, data.toDate);
  }
  return repo.update(id, patch);
}

export async function approveLeaveRequest(id: string, approvedBy: string, decision?: LeaveDecisionSchema): Promise<void> {
  return repo.update(id, {
    status:     "approved",
    approvedBy,
    approvedAt: serverTimestamp(),
    rejectedBy: null,
    comments:   decision?.comments || null,
  });
}

export async function rejectLeaveRequest(id: string, rejectedBy: string, decision?: LeaveDecisionSchema): Promise<void> {
  return repo.update(id, {
    status:     "rejected",
    rejectedBy,
    approvedBy: null,
    approvedAt: null,
    comments:   decision?.comments || null,
  });
}

export async function cancelLeaveRequest(id: string): Promise<void> {
  return repo.update(id, { status: "cancelled" });
}

export async function deleteLeaveRequest(id: string): Promise<void> {
  return repo.delete(id);
}
