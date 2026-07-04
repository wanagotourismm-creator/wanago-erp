import { cn } from "@/lib/utils/helpers";

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
