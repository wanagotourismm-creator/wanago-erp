"use client";

import { useState } from "react";
import { MoreHorizontal, Edit2, Trash2, CheckCircle2 } from "lucide-react";
import { RatingBadge } from "@/modules/performance/reviews/components/ReviewBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate, initials, cn } from "@/lib/utils/helpers";
import type { PerformanceReview } from "@/modules/performance/reviews/types";

type Props = {
  reviews:      PerformanceReview[];
  loading:      boolean;
  canManage:    boolean;
  onEdit:       (review: PerformanceReview) => void;
  onDelete:     (review: PerformanceReview) => void;
  onAcknowledge:(review: PerformanceReview) => void;
};

export function ReviewsTable({ reviews, loading, canManage, onEdit, onDelete, onAcknowledge }: Props) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  if (loading) return <SkeletonTable rows={5} />;

  if (reviews.length === 0) {
    return <EmptyState title="No reviews yet" description="Record your first performance review" icon={<span className="text-2xl">⭐</span>} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
              <tr key={r.id} className="hover:bg-muted/20 transition-colors group">
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
                    <div className="relative">
                      <button onClick={() => setMenuOpen(menuOpen === r.id ? null : r.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-all">
                        <MoreHorizontal size={15} />
                      </button>
                      {menuOpen === r.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-border bg-card shadow-lg py-1">
                            {r.status !== "acknowledged" && (
                              <button onClick={() => { onAcknowledge(r); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                                <CheckCircle2 size={13} /> Acknowledge
                              </button>
                            )}
                            <button onClick={() => { onEdit(r); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                              <Edit2 size={13} /> Edit
                            </button>
                            <button onClick={() => { onDelete(r); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
