import type { SystemRole } from "@/types/rbac";

export type ReportKey =
  | "employees" | "attendance" | "leaves" | "payroll"
  | "recruitment" | "performance" | "customer-retention" | "sales-trend";

export type ReportRow = Record<string, string | number>;

export type ReportTypeConfig = {
  key: ReportKey;
  label: string;
  hasDepartment: boolean;
  allowedRoles?: SystemRole[];
};

export type RetentionCohort = {
  month: string;
  newCustomers: number;
  rebooked90: number;
  pct90: number;
  rebooked180: number;
  pct180: number;
};

export type ReportData = {
  columns: string[];
  rows: ReportRow[];
  dateField?: string;
  deptField?: string;
  // Only populated for the customer-retention report — RetentionChart
  // reads the raw cohorts instead of the flattened rows so it isn't stuck
  // re-parsing display strings like "42.0%" back into numbers.
  cohorts?: RetentionCohort[];
};
