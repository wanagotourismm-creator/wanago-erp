"use client";

import { Edit2, Trash2 } from "lucide-react";
import { RatingBadge } from "@/modules/performance/reviews/components/ReviewBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { SwipeableRow, type SwipeAction } from "@/components/shared/SwipeableRow";
import { formatDate, initials, cn } from "@/lib/utils/helpers";
import type { PerformanceReview } from "@/modules/performance/reviews/types";

type Props = {
  reviews:      PerformanceReview[];
  loading:      boolean;
  canManage:    boolean;
  onView:       (review: PerformanceReview) => void;
  onEdit:       (review: PerformanceReview) => void;
  onDelete:     (review: PerformanceReview) => void;
};

export function ReviewsTable({ reviews, loading, canManage, onView, onEdit, onDelete }: Props) {
  if (loading) return <SkeletonTable rows={5} />;

  if (reviews.length === 0) {
    return <EmptyState title="No reviews yet" description="Record your first performance review" icon={<span className="text-2xl">⭐</span>} />;
  }

  return (
    <>
    <div className="hidden sm:block overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Employee", "Type", "Period", "Rating", "Reviewer", "Status", "Date", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reviews.map(r => (
              <tr
                key={r.id}
                onClick={() => onView(r)}
                className="cursor-pointer hover:bg-muted/20 transition-colors group"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(r.employeeName)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{r.employeeName}</p>
                      <p className="text-[11px] text-muted-foreground">{r.refNumber}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><span className="text-xs text-muted-foreground capitalize">{r.reviewType}</span></td>
                <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{r.period}</span></td>
                <td className="px-4 py-3"><RatingBadge rating={r.rating} /></td>
                <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{r.reviewerName}</span></td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    r.status === "acknowledged" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  )}>
                    {r.status === "acknowledged" ? "Acknowledged" : "Submitted"}
                  </span>
                </td>
                <td className="px-4 py-3"><span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(r.reviewDate)}</span></td>
                <td className="px-4 py-3">
                  {canManage && (
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(r); }}
                        title="Edit"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(r); }}
                        title="Delete"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="sm:hidden space-y-2.5">
      {reviews.map((r) => {
        const actions: SwipeAction[] = canManage ? [
          { key: "edit", icon: <Edit2 size={16} />, label: "Edit", onClick: () => onEdit(r), className: "bg-primary" },
          { key: "delete", icon: <Trash2 size={16} />, label: "Delete", onClick: () => onDelete(r), className: "bg-red-600" },
        ] : [];
        return (
          <SwipeableRow key={r.id} actions={actions} onTap={() => onView(r)} className="rounded-xl border border-border">
            <div className="rounded-xl bg-card p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initials(r.employeeName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{r.employeeName}</p>
                  <p className="text-[11px] text-muted-foreground">{r.refNumber} · {r.period}</p>
                </div>
                <RatingBadge rating={r.rating} />
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  r.status === "acknowledged" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                )}>
                  {r.status === "acknowledged" ? "Acknowledged" : "Submitted"}
                </span>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(r.reviewDate)}</span>
              </div>
            </div>
          </SwipeableRow>
        );
      })}
    </div>
    </>
  );
}
