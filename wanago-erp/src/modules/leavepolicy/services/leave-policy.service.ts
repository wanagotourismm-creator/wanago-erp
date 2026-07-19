import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export type LeaveTypeKey = "casual" | "sick" | "earned" | "emergency" | "wfh" | "loss_of_pay";

export type LeaveTypePolicy = { enabled: boolean; annualDays: number };

export type LeavePolicy = {
  leaveTypes: Record<LeaveTypeKey, LeaveTypePolicy>;
  weeklyOffDays: number[]; // 0 = Sunday ... 6 = Saturday
  // Admin-configurable enforcement rules, applied by createLeaveRequest for
  // an employee's own ESS self-apply (HR logging leave directly is exempt —
  // that's the policy's own "unless otherwise approved by Management" path).
  advanceNoticeEnabled: boolean;
  advanceNoticeWorkingDays: number;
  advanceNoticeRequiredTypes: LeaveTypeKey[];
  probationRestrictionEnabled: boolean;
  probationAllowedTypes: LeaveTypeKey[];
};

const DOC_ID = "leavePolicy";

export const LEAVE_TYPE_ORDER: LeaveTypeKey[] = ["casual", "sick", "earned", "emergency", "wfh", "loss_of_pay"];

export const LEAVE_TYPE_LABELS: Record<LeaveTypeKey, string> = {
  casual: "Casual Leave", sick: "Sick Leave", earned: "Earned Leave", emergency: "Emergency Leave", wfh: "Work From Home",
  loss_of_pay: "Loss of Pay",
};

export const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Casual + Sick + Loss of Pay enabled by default; everything else off until
// an admin turns it on. Sunday is the default weekly off day. Loss of Pay
// has no real entitlement cap (it's unpaid leave, not an accrued balance) —
// 365 just keeps it from ever reading as "exhausted".
// Matches the company's Leave Policy (HR-LV-001) §4/§7: Casual/Earned/WFH/
// Loss-of-Pay are "Planned Leave" needing 3 working days' notice; Sick and
// Emergency are exempt (their own ASAP-notice sections) and are also the
// only types allowed during probation.
export const DEFAULT_LEAVE_POLICY: LeavePolicy = {
  leaveTypes: {
    casual:      { enabled: true,  annualDays: 12 },
    sick:        { enabled: true,  annualDays: 12 },
    earned:      { enabled: false, annualDays: 15 },
    emergency:   { enabled: false, annualDays: 5 },
    wfh:         { enabled: false, annualDays: 12 },
    loss_of_pay: { enabled: true,  annualDays: 365 },
  },
  weeklyOffDays: [0],
  advanceNoticeEnabled: true,
  advanceNoticeWorkingDays: 3,
  advanceNoticeRequiredTypes: ["casual", "earned", "wfh", "loss_of_pay"],
  probationRestrictionEnabled: true,
  probationAllowedTypes: ["sick", "emergency"],
};

export async function fetchLeavePolicy(): Promise<LeavePolicy> {
  const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, DOC_ID));
  if (!snap.exists()) return DEFAULT_LEAVE_POLICY;
  const data = snap.data() as Partial<LeavePolicy>;
  return {
    ...DEFAULT_LEAVE_POLICY,
    ...data,
    leaveTypes: { ...DEFAULT_LEAVE_POLICY.leaveTypes, ...(data.leaveTypes ?? {}) },
  };
}

export async function updateLeavePolicy(data: LeavePolicy, updatedBy: string): Promise<void> {
  await setDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, DOC_ID), {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy,
  }, { merge: true });
}
