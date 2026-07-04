import { cn } from "@/lib/utils/helpers";

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-Time",
  part_time: "Part-Time",
  contract:  "Contract",
  intern:    "Intern",
};

export const PROBATION_STATUS_LABELS: Record<string, string> = {
  probation: "Probation",
  confirmed: "Confirmed",
};

export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  active:     "Active",
  inactive:   "Inactive",
  terminated: "Terminated",
  resigned:   "Resigned",
};

export const DEPARTMENTS = [
  "Sales", "Marketing", "Operations", "Finance", "HR", "IT", "Customer Support", "Management",
];

const STATUS_STYLES: Record<string, string> = {
  active:     "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inactive:   "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  terminated: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  resigned:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export function EmployeeStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
    )}>
      {EMPLOYEE_STATUS_LABELS[status] ?? status}
    </span>
  );
}

const PROBATION_STYLES: Record<string, string> = {
  probation: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export function ProbationStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      PROBATION_STYLES[status] ?? "bg-muted text-muted-foreground"
    )}>
      {PROBATION_STATUS_LABELS[status] ?? status}
    </span>
  );
}
