import type { FirestoreRecord } from "@/types/global";

export type EmploymentType = "full_time" | "part_time" | "contract" | "intern" | "probation";
export type EmployeeStatus = "active" | "inactive" | "terminated" | "resigned" | "on_leave";
export type Gender         = "male" | "female" | "other";

export type Employee = FirestoreRecord & {
  // Auto-generated
  employeeId:      string;

  // Personal
  fullName:        string;
  email:           string;
  phone:           string;
  gender:          Gender | null;
  dateOfBirth:     string | null;
  address:         string | null;
  city:            string | null;
  state:           string | null;
  photoURL:        string | null;

  // Employment
  department:      string;
  designation:     string;
  reportingManager:string | null;
  employmentType:  EmploymentType;
  dateOfJoining:   string;
  probationStatus: "confirmed" | "probation" | "extended";
  employeeStatus:  EmployeeStatus;
  officeId:        string;
  officeName:      string;
  userId:          string | null; // link to ERP user

  // Financial
  basicSalary:     number;
  hra:             number;
  allowances:      number;
  uan:             string | null;
  pfNumber:        string | null;
  panNumber:       string | null;
  bankName:        string | null;
  accountNumber:   string | null;
  ifscCode:        string | null;

  // System
  notes:           string | null;
};

// ── Leave Types ───────────────────────────────────────────────
export type LeaveType   = "casual" | "sick" | "earned" | "emergency" | "wfh";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export type LeaveRequest = FirestoreRecord & {
  employeeId:   string;
  employeeName: string;
  leaveType:    LeaveType;
  fromDate:     string;
  toDate:       string;
  days:         number;
  reason:       string;
  status:       LeaveStatus;
  approvedBy:   string | null;
  approvedAt:   unknown | null;
  rejectedBy:   string | null;
  comments:     string | null;
  officeId:     string;
};

// ── Attendance ────────────────────────────────────────────────
export type AttendanceStatus = "present" | "absent" | "half_day" | "leave" | "wfh" | "holiday";

export type AttendanceRecord = FirestoreRecord & {
  employeeId:   string;
  employeeName: string;
  date:         string;
  clockIn:      string | null;
  clockOut:     string | null;
  status:       AttendanceStatus;
  hoursWorked:  number | null;
  notes:        string | null;
  officeId:     string;
};

// ── Payroll ───────────────────────────────────────────────────
export type PayrollStatus = "draft" | "processed" | "paid";

export type PayrollRecord = FirestoreRecord & {
  employeeId:    string;
  employeeName:  string;
  month:         number;
  year:          number;
  basicSalary:   number;
  hra:           number;
  allowances:    number;
  incentives:    number;
  bonus:         number;
  deductions:    number;
  grossSalary:   number;
  netSalary:     number;
  payrollStatus: PayrollStatus;
  paidAt:        unknown | null;
  officeId:      string;
};

// ── Recruitment ───────────────────────────────────────────────
export type CandidateStage =
  | "applied" | "screening" | "interview_r1" | "interview_r2"
  | "hr_round" | "offer_sent" | "joined" | "rejected";

export type Candidate = FirestoreRecord & {
  name:          string;
  email:         string;
  phone:         string;
  position:      string;
  department:    string;
  stage:         CandidateStage;
  resumeURL:     string | null;
  source:        string | null;
  notes:         string | null;
  interviewDate: string | null;
  officeId:      string;
};
