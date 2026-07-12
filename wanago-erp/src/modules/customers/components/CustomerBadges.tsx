import { cn } from "@/lib/utils/helpers";
import type { CustomerSegment } from "@/modules/customers/utils/segment";

export const CUSTOMER_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "corporate",  label: "Corporate"  },
  { value: "group",      label: "Group"      },
];

export const CUSTOMER_SOURCES = [
  "Referral", "Website", "Social Media", "Walk-in", "Repeat Customer", "Agent Network",
];

const TYPE_STYLES: Record<string, string> = {
  individual: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  corporate:  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  group:      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export function CustomerTypeBadge({ type }: { type: string }) {
  const label = CUSTOMER_TYPES.find(t => t.value === type)?.label ?? type;
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      TYPE_STYLES[type] ?? "bg-muted text-muted-foreground"
    )}>
      {label}
    </span>
  );
}

export const CUSTOMER_SEGMENT_LABELS: Record<CustomerSegment, string> = {
  new:     "New",
  repeat:  "Repeat",
  vip:     "VIP",
  dormant: "Dormant",
};

const SEGMENT_ICONS: Record<CustomerSegment, string> = {
  new: "✨", repeat: "🔁", vip: "⭐", dormant: "💤",
};

const SEGMENT_STYLES: Record<CustomerSegment, string> = {
  new:     "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  repeat:  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  vip:     "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  dormant: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export function CustomerSegmentBadge({ segment }: { segment: CustomerSegment }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
      SEGMENT_STYLES[segment]
    )}>
      {SEGMENT_ICONS[segment]} {CUSTOMER_SEGMENT_LABELS[segment]}
    </span>
  );
}
