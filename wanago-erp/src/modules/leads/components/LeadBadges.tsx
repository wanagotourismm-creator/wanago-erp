import { cn } from "@/lib/utils/helpers";
import { LEAD_STAGE_LABELS } from "@/lib/constants";

const STAGE_STYLES: Record<string, string> = {
  new:         "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contacted:   "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  follow_up:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  quoted:      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  negotiation: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  won:         "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  lost:        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const PRIORITY_STYLES: Record<string, string> = {
  hot:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  warm: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  cold: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const PRIORITY_ICONS: Record<string, string> = {
  hot: "🔥", warm: "☀️", cold: "❄️",
};

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      STAGE_STYLES[stage] ?? "bg-muted text-muted-foreground"
    )}>
      {LEAD_STAGE_LABELS[stage as keyof typeof LEAD_STAGE_LABELS] ?? stage}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
      PRIORITY_STYLES[priority] ?? "bg-muted text-muted-foreground"
    )}>
      {PRIORITY_ICONS[priority]}
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

// Shown the moment a lead's phone number matches an existing Customer —
// surfaces "this person has enquired/booked with us before" as soon as the
// enquiry comes in, instead of only being discovered silently at "won".
export function ReturningCustomerBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
      🔁 Returning Customer
    </span>
  );
}
