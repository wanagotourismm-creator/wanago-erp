import { cn } from "@/lib/utils/helpers";

const BROCHURE_STATUS_LABELS: Record<string, string> = {
  draft:    "Draft",
  sent:     "Sent",
  archived: "Archived",
};

const STATUS_STYLES: Record<string, string> = {
  draft:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  sent:     "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  archived: "bg-muted text-muted-foreground",
};

export function BrochureStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
    )}>
      {BROCHURE_STATUS_LABELS[status] ?? status}
    </span>
  );
}
