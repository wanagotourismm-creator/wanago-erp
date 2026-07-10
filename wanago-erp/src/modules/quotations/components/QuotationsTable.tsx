"use client";

import { Edit2, Trash2 } from "lucide-react";
import { QuotationStatusBadge, formatAmount } from "@/modules/quotations/components/QuotationBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { SwipeableRow, type SwipeAction } from "@/components/shared/SwipeableRow";
import { formatDate, initials } from "@/lib/utils/helpers";
import type { Quotation } from "@/modules/quotations/types";

type Props = {
  quotations: Quotation[];
  loading:    boolean;
  canEdit:    boolean;
  canDelete:  boolean;
  onView:     (quotation: Quotation) => void;
  onEdit:     (quotation: Quotation) => void;
  onDelete:   (quotation: Quotation) => void;
};

export function QuotationsTable({ quotations, loading, canEdit, canDelete, onView, onEdit, onDelete }: Props) {
  if (loading) return <SkeletonTable rows={6} />;

  if (quotations.length === 0) {
    return (
      <EmptyState
        title="No quotations yet"
        description="Create your first quotation to get started"
        icon={<span className="text-2xl">📋</span>}
      />
    );
  }

  return (
    <>
    {/* Desktop table */}
    <div className="hidden sm:block overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Customer", "Destination", "Total", "Valid Until", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {quotations.map((q) => (
              <tr
                key={q.id}
                onClick={() => onView(q)}
                className="cursor-pointer hover:bg-muted/20 transition-colors group"
              >

                {/* Customer + ref */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(q.customerName)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{q.customerName}</p>
                      <p className="text-[11px] text-muted-foreground">{q.refNumber}</p>
                    </div>
                  </div>
                </td>

                {/* Destination */}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{q.destination}</span>
                </td>

                {/* Total */}
                <td className="px-4 py-3">
                  <span className="text-xs text-foreground">{formatAmount(q.totalAmount)}</span>
                </td>

                {/* Valid Until */}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {q.validUntil ? formatDate(q.validUntil) : "—"}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <QuotationStatusBadge status={q.status} />
                </td>

                {/* Actions — inline, same line, revealed on row hover */}
                <td className="px-4 py-3">
                  {(canEdit || canDelete) && (
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {canEdit && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onEdit(q); }}
                          title="Edit"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(q); }}
                          title="Delete"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
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

    {/* Mobile card list */}
    <div className="sm:hidden space-y-2.5">
      {quotations.map((q) => {
        const actions: SwipeAction[] = [
          ...(canEdit ? [{ key: "edit", icon: <Edit2 size={16} />, label: "Edit", onClick: () => onEdit(q), className: "bg-blue-600" }] : []),
          ...(canDelete ? [{ key: "delete", icon: <Trash2 size={16} />, label: "Delete", onClick: () => onDelete(q), className: "bg-red-600" }] : []),
        ];
        return (
          <SwipeableRow key={q.id} actions={actions} onTap={() => onView(q)} className="rounded-xl border border-border">
            <div className="rounded-xl bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initials(q.customerName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{q.customerName}</p>
                    <p className="text-[11px] text-muted-foreground">{q.refNumber}</p>
                  </div>
                </div>
                <QuotationStatusBadge status={q.status} />
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                <p className="truncate text-xs text-muted-foreground">{q.destination}</p>
                <span className="text-xs font-medium text-foreground whitespace-nowrap">{formatAmount(q.totalAmount)}</span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Valid until {q.validUntil ? formatDate(q.validUntil) : "—"}
              </div>
            </div>
          </SwipeableRow>
        );
      })}
    </div>
    </>
  );
}
