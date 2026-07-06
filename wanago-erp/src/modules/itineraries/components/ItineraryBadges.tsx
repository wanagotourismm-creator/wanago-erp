import { cn } from "@/lib/utils/helpers";

const ITINERARY_STATUS_LABELS: Record<string, string> = {
  draft:     "Draft",
  confirmed: "Confirmed",
};

const STATUS_STYLES: Record<string, string> = {
  draft:     "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  confirmed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export function ItineraryStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
    )}>
      {ITINERARY_STATUS_LABELS[status] ?? status}
    </span>
  );
}
