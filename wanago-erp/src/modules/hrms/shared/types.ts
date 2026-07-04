import type { FieldValue } from "firebase/firestore";
import type { FirestoreRecord, Timestamp } from "@/types/global";

export type Employee = FirestoreRecord & {
  fullName: string;
  department: string;
  designation?: string;
  userId?: string;
  officeId: string;
  basicSalary: number;
  hra: number;
  allowances: number;
};

export type PayrollRecord = FirestoreRecord & {
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  basicSalary: number;
  hra: number;
  allowances: number;
  incentives: number;
  bonus: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  officeId: string;
  payrollStatus: "draft" | "processed" | "paid";
  paidAt: Timestamp | Date | string | FieldValue | null;
};

export type LeaveRequest = FirestoreRecord & {
  employeeId: string;
  employeeName: string;
  leaveType: "casual" | "sick" | "earned" | "emergency" | "wfh";
  fromDate: string;
  toDate: string;
  reason: string;
  officeId: string;
  days: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approvedBy: string | null;
  approvedAt: Timestamp | Date | string | FieldValue | null;
  rejectedBy: string | null;
  comments: string | null;
};

export type AttendanceRecord = FirestoreRecord & {
  employeeId: string;
  employeeName: string;
  date: string;
  status: "present" | "absent" | "half_day" | "leave" | "wfh" | "holiday";
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number | null;
  notes: string | null;
  officeId: string;
};
