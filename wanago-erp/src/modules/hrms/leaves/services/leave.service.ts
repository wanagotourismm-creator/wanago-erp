import { orderBy, where, serverTimestamp } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { fetchLeavePolicy } from "@/modules/leavepolicy/services/leave-policy.service";
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

function rangesOverlap(aFrom: string, aTo: string, bFrom: string, bTo: string): boolean {
  return aFrom <= bTo && bFrom <= aTo;
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
  // Block the same employee from holding two pending/approved leave
  // requests over the same days — previously nothing checked this, so an
  // employee could get two overlapping ranges approved and have both
  // counted separately against their balance.
  const existingForEmployee = await fetchLeavesByEmployee(data.employeeId);
  const overlapping = existingForEmployee.find((l) =>
    (l.status === "pending" || l.status === "approved") &&
    rangesOverlap(l.fromDate, l.toDate, data.fromDate, data.toDate)
  );
  if (overlapping) {
    throw new Error(
      `This overlaps an existing ${overlapping.status} leave request (${overlapping.fromDate} to ${overlapping.toDate}).`
    );
  }

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
  const request = await repo.findById(id);
  if (!request) throw new Error("Leave request not found.");

  // Loss of Pay is explicitly uncapped (see DEFAULT_LEAVE_POLICY) — every
  // other type must not be approved past the employee's annual entitlement.
  // Previously nothing checked this at all, so a manager could approve a
  // request that pushed used days past what's left.
  if (request.leaveType !== "loss_of_pay") {
    const [policy, employeeLeaves] = await Promise.all([
      fetchLeavePolicy(),
      fetchLeavesByEmployee(request.employeeId),
    ]);
    const entitlement = policy.leaveTypes[request.leaveType as keyof typeof policy.leaveTypes]?.annualDays ?? 0;
    const requestYear = new Date(request.fromDate).getFullYear();
    const usedExcludingThis = employeeLeaves
      .filter((l) =>
        l.id !== id && l.leaveType === request.leaveType && l.status === "approved" &&
        new Date(l.fromDate).getFullYear() === requestYear
      )
      .reduce((sum, l) => sum + l.days, 0);
    if (usedExcludingThis + request.days > entitlement) {
      throw new Error(
        `Approving this would use ${usedExcludingThis + request.days} days against a ${entitlement}-day annual entitlement (${usedExcludingThis} already approved this year).`
      );
    }
  }

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
