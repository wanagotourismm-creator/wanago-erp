import { cn } from "@/lib/utils/helpers";

const PRIORITY_STYLES: Record<string, string> = {
  low:    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  high:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_STYLES: Record<string, string> = {
  open:        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  resolved:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed:      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export const TICKET_STATUS_LABELS: Record<string, string> = {
  open: "Open", in_progress: "In Progress", resolved: "Resolved", closed: "Closed",
};

export function TicketPriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", PRIORITY_STYLES[priority] ?? "bg-muted text-muted-foreground")}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

export function TicketStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[status] ?? "bg-muted text-muted-foreground")}>
      {TICKET_STATUS_LABELS[status] ?? status}
    </span>
  );
}
