import { cn } from "@/lib/utils/helpers";
import { RATING_LABELS } from "@/lib/constants";

const RATING_STYLES: Record<string, string> = {
  outstanding:          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  exceeds_expectations: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  meets_expectations:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  needs_improvement:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function RatingBadge({ rating }: { rating: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      RATING_STYLES[rating] ?? "bg-muted text-muted-foreground"
    )}>
      {RATING_LABELS[rating as keyof typeof RATING_LABELS] ?? rating}
    </span>
  );
}
