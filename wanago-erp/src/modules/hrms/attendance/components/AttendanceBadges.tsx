import { cn } from "@/lib/utils/helpers";

const STATUS_STYLES: Record<string, string> = {
  present:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  absent:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  half_day: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  leave:    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  wfh:      "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  holiday:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const STATUS_LABELS: Record<string, string> = {
  present: "Present", absent: "Absent", half_day: "Half Day",
  leave: "On Leave", wfh: "WFH", holiday: "Holiday",
};

export function AttendanceStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
    )}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
