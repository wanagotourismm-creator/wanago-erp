"use client";

import { Edit2, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/helpers";
import type { Package } from "@/modules/packages/types";

type Props = {
  packages: Package[];
  loading:  boolean;
  onView:   (pkg: Package) => void;
  onEdit:   (pkg: Package) => void;
  onDelete: (pkg: Package) => void;
};

export function PackagesTable({ packages, loading, onView, onEdit, onDelete }: Props) {
  if (loading) return <SkeletonTable rows={6} />;

  if (packages.length === 0) {
    return (
      <EmptyState
        title="No packages yet"
        description="Add your first package to build your catalog"
        icon={<span className="text-2xl">🧳</span>}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Title", "Destination", "Category", "Duration", "Base Price", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {packages.map((pkg) => (
              <tr
                key={pkg.id}
                onClick={() => onView(pkg)}
                className="cursor-pointer hover:bg-muted/20 transition-colors group"
              >

                {/* Title + ref */}
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{pkg.title}</p>
                    <p className="text-[11px] text-muted-foreground">{pkg.refNumber}</p>
                  </div>
                </td>

                {/* Destination */}
                <td className="px-4 py-3">
                  <span className="text-foreground">{pkg.destination}</span>
                </td>

                {/* Category */}
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {pkg.category}
                  </span>
                </td>

                {/* Duration */}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {pkg.durationDays}D / {pkg.durationNights}N
                  </span>
                </td>

                {/* Base Price */}
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">₹{pkg.basePrice.toLocaleString()}</span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    pkg.packageStatus === "active"
                      ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {pkg.packageStatus === "active" ? "Active" : "Inactive"}
                  </span>
                </td>

                {/* Actions — inline, same line, revealed on row hover */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(pkg); }}
                      title="Edit"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(pkg); }}
                      title="Delete"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
