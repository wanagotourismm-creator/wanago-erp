import { cn, formatCurrency } from "@/lib/utils/helpers";

export const PAYMENT_METHODS = [
  "Cash", "Card", "Bank Transfer", "UPI", "Cheque",
];

const METHOD_STYLES: Record<string, string> = {
  Cash:          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Card:          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Bank Transfer": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  UPI:           "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  Cheque:        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export function PaymentMethodBadge({ method }: { method: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      METHOD_STYLES[method] ?? "bg-muted text-muted-foreground"
    )}>
      {method}
    </span>
  );
}

export function formatAmount(amount: number) {
  return formatCurrency(amount);
}
