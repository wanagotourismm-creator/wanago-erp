import { cn } from "@/lib/utils/helpers";

const STATUS_STYLES: Record<string, string> = {
  pending_finance:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  finance_approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ops_pending:      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  confirmed:        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed:        "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  cancelled:        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  pending_finance: "Pending Finance", finance_approved: "Finance Approved",
  ops_pending: "Ops Pending", confirmed: "Confirmed",
  completed: "Completed", cancelled: "Cancelled",
};

const PAYMENT_STYLES: Record<string, string> = {
  paid:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  unpaid:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  overdue: "bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export function BookingStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      STATUS_STYLES[status] ?? "bg-muted text-muted-foreground")}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      PAYMENT_STYLES[status] ?? "bg-muted text-muted-foreground")}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export const BOOKING_STATUS_OPTIONS = [
  { value: "pending_finance",  label: "Pending Finance"  },
  { value: "finance_approved", label: "Finance Approved" },
  { value: "ops_pending",      label: "Ops Pending"      },
  { value: "confirmed",        label: "Confirmed"        },
  { value: "completed",        label: "Completed"        },
  { value: "cancelled",        label: "Cancelled"        },
];
