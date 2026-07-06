import { cn, formatCurrency } from "@/lib/utils/helpers";

const STATUS_LABELS: Record<string, string> = {
  pending:  "Pending",
  approved: "Approved",
  paid:     "Paid",
  rejected: "Rejected",
};

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  paid:     "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function ExpenseStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
    )}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function formatAmount(amount: number) {
  return formatCurrency(amount);
}
