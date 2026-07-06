import { cn } from "@/lib/utils/helpers";

export const SUPPLIER_CATEGORIES = [
  { value: "Hotel",      label: "Hotel"      },
  { value: "Transport",  label: "Transport"  },
  { value: "Activity",   label: "Activity"   },
  { value: "Guide",      label: "Guide"      },
  { value: "Airline",    label: "Airline"    },
  { value: "Restaurant", label: "Restaurant" },
  { value: "Other",      label: "Other"      },
];

const CATEGORY_STYLES: Record<string, string> = {
  Hotel:      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Transport:  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Activity:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Guide:      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Airline:    "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  Restaurant: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

export function SupplierCategoryBadge({ category }: { category: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      CATEGORY_STYLES[category] ?? "bg-muted text-muted-foreground"
    )}>
      {category}
    </span>
  );
}

export function SupplierStatusBadge({ status }: { status: "active" | "inactive" }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      status === "active"
        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        : "bg-muted text-muted-foreground"
    )}>
      {status === "active" ? "Active" : "Inactive"}
    </span>
  );
}
