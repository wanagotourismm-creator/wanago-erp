import type { FieldValue } from "firebase/firestore";
import type { FirestoreRecord, Timestamp } from "@/types/global";

export type EmploymentType = "full_time" | "part_time" | "contract" | "intern";
export type ProbationStatus = "probation" | "confirmed";
export type EmployeeStatus = "active" | "inactive" | "terminated" | "resigned";
export type Gender = "male" | "female" | "other";

export type EmployeeDocument = {
  id:         string;
  label:      string;
  url:        string;
  uploadedAt: Timestamp | Date | string;
};

export type Employee = FirestoreRecord & {
  employeeCode: string;

  // Personal
  fullName:          string;
  profilePictureUrl: string | null;
  gender:            Gender | null;
  dateOfBirth:       string | null;
  mobileNumber:      string;
  email:             string | null;
  address:           string | null;

  // Employment
  department:            string;
  designation:           string;
  reportingManagerId:    string | null;
  reportingManagerName:  string | null;
  employmentType:        EmploymentType;
  dateOfJoining:         string | null;
  probationStatus:       ProbationStatus;
  employeeStatus:        EmployeeStatus;

  // Financial
  basicSalary:      number;
  hra:               number;
  allowances:        number;
  bankAccountNumber: string | null;
  bankName:          string | null;
  ifscCode:          string | null;
  uan:               string | null;
  pfNumber:          string | null;
  panNumber:         string | null;

  // Documents
  documents: EmployeeDocument[];

  // Linkage — explicitly set by an admin via the "Linked Login Account"
  // field in EmployeeForm, or auto-backfilled on first My HR visit if the
  // employee's email matches their Firebase Auth email exactly.
  userId?:    string | null;
  officeId:   string;
  officeName: string;
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
  leaveType: "casual" | "sick" | "earned" | "emergency" | "wfh" | "loss_of_pay";
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
  breakStartTime: string | null;
  breakMinutes: number;
  clockInLat: number | null;
  clockInLng: number | null;
  withinGeofence: boolean | null;
};

export type AttendanceRegularization = FirestoreRecord & {
  employeeId: string;
  employeeName: string;
  date: string;
  requestedClockIn: string | null;
  requestedClockOut: string | null;
  reason: string;
  officeId: string;
  regularizationStatus: "pending" | "approved" | "rejected";
  approvedBy: string | null;
  approvedAt: Timestamp | Date | string | FieldValue | null;
  rejectedBy: string | null;
};
