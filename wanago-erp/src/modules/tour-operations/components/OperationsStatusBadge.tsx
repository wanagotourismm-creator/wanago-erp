import { cn } from "@/lib/utils/helpers";
import { OPERATIONS_STAGE_LABELS, type OperationsStage } from "@/lib/constants";

const STATUS_STYLES: Record<OperationsStage, string> = {
  booking_received:               "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  booking_verification_completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  bookings_completed:             "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  pre_departure_completed:        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  tour_ongoing:                   "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  tour_completed:                 "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  package_closed:                 "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export function OperationsStatusBadge({ status }: { status: OperationsStage }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
      STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
    )}>
      {OPERATIONS_STAGE_LABELS[status] ?? status}
    </span>
  );
}
