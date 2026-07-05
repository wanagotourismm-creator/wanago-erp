"use client";

import { X, Edit2, Trash2, CheckCircle2, Star, User } from "lucide-react";
import { RatingBadge } from "@/modules/performance/reviews/components/ReviewBadges";
import { formatDate, initials, cn } from "@/lib/utils/helpers";
import type { PerformanceReview } from "@/modules/performance/reviews/types";

type Props = {
  review:       PerformanceReview | null;
  canManage:    boolean;
  onClose:      () => void;
  onEdit:       (review: PerformanceReview) => void;
  onDelete:     (review: PerformanceReview) => void;
  onAcknowledge:(review: PerformanceReview) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function ReviewDetailModal({ review, canManage, onClose, onEdit, onDelete, onAcknowledge }: Props) {
  if (!review) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {initials(review.employeeName)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{review.employeeName}</h2>
              <p className="text-xs text-muted-foreground">{review.refNumber} · Reviewed {formatDate(review.reviewDate)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">

          <div className="flex flex-wrap items-center gap-2">
            <RatingBadge rating={review.rating} />
            <span className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              review.status === "acknowledged" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            )}>
              {review.status === "acknowledged" ? "Acknowledged" : "Submitted"}
            </span>
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground capitalize">
              {review.reviewType}
            </span>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Star size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Review Details</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Period" value={review.period} />
              <Row label="Review Date" value={formatDate(review.reviewDate)} />
              <Row label="Reviewer" value={review.reviewerName} />
              <Row label="Office" value={review.officeName} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <User size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Employee</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Employee" value={review.employeeName} />
            </div>
          </div>

          {review.strengths && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Strengths</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {review.strengths}
              </p>
            </div>
          )}

          {review.areasForImprovement && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Areas for Improvement</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {review.areasForImprovement}
              </p>
            </div>
          )}

          {review.comments && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Additional Comments</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {review.comments}
              </p>
            </div>
          )}

        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
          {canManage ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(review)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
              >
                <Edit2 size={13} /> Edit
              </button>
              <button
                onClick={() => onDelete(review)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          ) : <div />}
          {review.status !== "acknowledged" && (
            <button
              onClick={() => onAcknowledge(review)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm"
            >
              <CheckCircle2 size={13} /> Acknowledge
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
