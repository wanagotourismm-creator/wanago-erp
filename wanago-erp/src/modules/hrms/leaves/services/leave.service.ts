import { orderBy, where, serverTimestamp } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { fetchLeavePolicy } from "@/modules/leavepolicy/services/leave-policy.service";
import { fetchEmployeeById } from "@/modules/hrms/employees/services/employee.service";
import { fetchHolidays } from "@/modules/admin/holidays/services/holiday.service";
import { todayIST } from "@/lib/utils/helpers";
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

// Leave Policy (HR-LV-001) §4/§5/§6: Casual/Earned/WFH/Loss-of-Pay are
// "Planned Leave" and need 3 working days' notice; Sick and Emergency have
// their own ASAP/immediate-notice processes instead and are exempt.
const PLANNED_LEAVE_TYPES = new Set<string>(["casual", "earned", "wfh", "loss_of_pay"]);
const ADVANCE_NOTICE_WORKING_DAYS = 3;

// Parses a "YYYY-MM-DD" string into a local-time Date via explicit
// numeric parts (not `new Date(dateStr)`, which parses as UTC and can land
// on the wrong calendar day/weekday once shifted to IST — see todayIST()'s
// own comment for the same class of bug this project already hit once).
function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isWorkingDay(dateStr: string, weeklyOffDays: number[], holidayDates: Set<string>): boolean {
  return !weeklyOffDays.includes(parseDateStr(dateStr).getDay()) && !holidayDates.has(dateStr);
}

// The earliest date that is `n` working days after `startDateStr`.
function addWorkingDays(startDateStr: string, n: number, weeklyOffDays: number[], holidayDates: Set<string>): string {
  const cur = parseDateStr(startDateStr);
  let counted = 0;
  while (counted < n) {
    cur.setDate(cur.getDate() + 1);
    if (isWorkingDay(toDateStr(cur), weeklyOffDays, holidayDates)) counted++;
  }
  return toDateStr(cur);
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

export async function createLeaveRequest(
  data: LeaveRequestSchema,
  createdBy: string,
  options?: { skipPolicyChecks?: boolean }
): Promise<LeaveRequest> {
  // HR/Admin logging a leave directly (LeavesPage's addLeave) IS the
  // Leave Policy's "unless otherwise approved by Management" exception —
  // only the employee's own ESS self-apply flow enforces these.
  if (!options?.skipPolicyChecks) {
    const [employee, policy, holidays] = await Promise.all([
      fetchEmployeeById(data.employeeId),
      fetchLeavePolicy(),
      fetchHolidays(),
    ]);

    // Leave Policy §7: employees on probation aren't eligible for Paid Leave
    // — only Sick and Emergency (the policy's own "genuine emergency or
    // exceptional circumstance" carve-out) go through during probation.
    if (employee?.probationStatus === "probation" && data.leaveType !== "sick" && data.leaveType !== "emergency") {
      throw new Error(
        "Employees on probation aren't eligible for this leave type — only Sick and Emergency leave are allowed during probation. Contact HR for an exception."
      );
    }

    // Leave Policy §4: planned leave must be applied at least 3 working days
    // in advance.
    if (PLANNED_LEAVE_TYPES.has(data.leaveType)) {
      const holidayDates = new Set(holidays.map((h) => h.date));
      const minFromDate = addWorkingDays(todayIST(), ADVANCE_NOTICE_WORKING_DAYS, policy.weeklyOffDays, holidayDates);
      if (data.fromDate < minFromDate) {
        throw new Error(
          `This leave type needs at least ${ADVANCE_NOTICE_WORKING_DAYS} working days' notice — the earliest start date is ${minFromDate}.`
        );
      }
    }
  }

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
