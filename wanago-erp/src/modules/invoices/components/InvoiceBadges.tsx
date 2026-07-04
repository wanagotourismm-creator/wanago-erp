import { cn, formatCurrency } from "@/lib/utils/helpers";
import { INVOICE_STATUS_LABELS } from "@/lib/constants";

const STATUS_STYLES: Record<string, string> = {
  draft:   "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  sent:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  unpaid:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  partial: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  paid:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
    )}>
      {INVOICE_STATUS_LABELS[status as keyof typeof INVOICE_STATUS_LABELS] ?? status}
    </span>
  );
}

export function formatAmount(amount: number) {
  return formatCurrency(amount);
}
