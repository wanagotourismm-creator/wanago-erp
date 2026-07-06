import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export type LeaveTypeKey = "casual" | "sick" | "earned" | "emergency" | "wfh" | "loss_of_pay";

export type LeaveTypePolicy = { enabled: boolean; annualDays: number };

export type LeavePolicy = {
  leaveTypes: Record<LeaveTypeKey, LeaveTypePolicy>;
  weeklyOffDays: number[]; // 0 = Sunday ... 6 = Saturday
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
};

export async function fetchLeavePolicy(): Promise<LeavePolicy> {
  const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, DOC_ID));
  if (!snap.exists()) return DEFAULT_LEAVE_POLICY;
  const data = snap.data() as Partial<LeavePolicy>;
  return {
    leaveTypes: { ...DEFAULT_LEAVE_POLICY.leaveTypes, ...(data.leaveTypes ?? {}) },
    weeklyOffDays: data.weeklyOffDays ?? DEFAULT_LEAVE_POLICY.weeklyOffDays,
  };
}

export async function updateLeavePolicy(data: LeavePolicy, updatedBy: string): Promise<void> {
  await setDoc(doc(db, FIRESTORE_COLLECTIONS.SETTINGS, DOC_ID), {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy,
  }, { merge: true });
}
