import { cn, formatCurrency } from "@/lib/utils/helpers";

const STATUS_STYLES: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  processed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  paid:      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export function PayrollStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
    )}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export const MONTH_LABELS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatSalary(amount: number) {
  return formatCurrency(amount);
}
