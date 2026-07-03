import { cn } from "@/lib/utils/helpers";

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const TYPE_STYLES: Record<string, string> = {
  casual:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  sick:      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  earned:    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  emergency: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  wfh:       "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
};

const TYPE_LABELS: Record<string, string> = {
  casual: "Casual", sick: "Sick", earned: "Earned", emergency: "Emergency", wfh: "WFH",
};

export function LeaveStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
    )}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function LeaveTypeBadge({ type }: { type: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      TYPE_STYLES[type] ?? "bg-muted text-muted-foreground"
    )}>
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}
