import { cn, formatCurrency } from "@/lib/utils/helpers";

export const QUOTATION_STATUS_LABELS: Record<string, string> = {
  draft:     "Draft",
  sent:      "Sent",
  accepted:  "Accepted",
  rejected:  "Rejected",
  expired:   "Expired",
  converted: "Converted",
};

const STATUS_STYLES: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  sent:      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  accepted:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  expired:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  converted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

export function QuotationStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
    )}>
      {QUOTATION_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function formatAmount(amount: number) {
  return formatCurrency(amount);
}
