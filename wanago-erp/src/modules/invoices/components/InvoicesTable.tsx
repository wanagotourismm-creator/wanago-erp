"use client";

import { Edit2, Trash2 } from "lucide-react";
import { InvoiceStatusBadge, formatAmount } from "@/modules/invoices/components/InvoiceBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate, initials } from "@/lib/utils/helpers";
import type { Invoice } from "@/modules/invoices/types";

type Props = {
  invoices:  Invoice[];
  loading:   boolean;
  canManage: boolean;
  onView:    (invoice: Invoice) => void;
  onEdit:    (invoice: Invoice) => void;
  onDelete:  (invoice: Invoice) => void;
};

export function InvoicesTable({ invoices, loading, canManage, onView, onEdit, onDelete }: Props) {
  if (loading) return <SkeletonTable rows={6} />;

  if (invoices.length === 0) {
    return (
      <EmptyState
        title="No invoices yet"
        description="Create your first invoice to get started"
        icon={<span className="text-2xl">🧾</span>}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Customer", "Booking", "Total", "Balance", "Due Date", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                onClick={() => onView(inv)}
                className="cursor-pointer hover:bg-muted/20 transition-colors group"
              >

                {/* Customer + ref */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(inv.customerName)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{inv.customerName}</p>
                      <p className="text-[11px] text-muted-foreground">{inv.refNumber}</p>
                    </div>
                  </div>
                </td>

                {/* Booking */}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{inv.bookingRef || "—"}</span>
                </td>

                {/* Total */}
                <td className="px-4 py-3">
                  <span className="text-xs text-foreground">{formatAmount(inv.totalAmount)}</span>
                </td>

                {/* Balance */}
                <td className="px-4 py-3">
                  <span className={inv.balanceDue > 0 ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>
                    {inv.balanceDue > 0 ? formatAmount(inv.balanceDue) : "Paid"}
                  </span>
                </td>

                {/* Due Date */}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {inv.dueDate ? formatDate(inv.dueDate) : "—"}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <InvoiceStatusBadge status={inv.status} />
                </td>

                {/* Actions — inline, same line, revealed on row hover */}
                <td className="px-4 py-3">
                  {canManage && (
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(inv); }}
                        title="Edit"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(inv); }}
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
  );
}
