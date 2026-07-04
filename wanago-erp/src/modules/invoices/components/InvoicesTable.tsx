"use client";

import { useState } from "react";
import { MoreHorizontal, Edit2, Trash2, Send } from "lucide-react";
import { InvoiceStatusBadge, formatAmount } from "@/modules/invoices/components/InvoiceBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate, initials } from "@/lib/utils/helpers";
import type { Invoice } from "@/modules/invoices/types";

type Props = {
  invoices:  Invoice[];
  loading:   boolean;
  canManage: boolean;
  onEdit:    (invoice: Invoice) => void;
  onDelete:  (invoice: Invoice) => void;
  onSend:    (invoice: Invoice) => void;
};

export function InvoicesTable({ invoices, loading, canManage, onEdit, onDelete, onSend }: Props) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

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
              <tr key={inv.id} className="hover:bg-muted/20 transition-colors group">

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

                {/* Actions */}
                <td className="px-4 py-3">
                  {canManage && (
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === inv.id ? null : inv.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <MoreHorizontal size={15} />
                      </button>

                      {menuOpen === inv.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-border bg-card shadow-lg py-1">
                            {inv.status === "draft" && (
                              <button
                                onClick={() => { onSend(inv); setMenuOpen(null); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                <Send size={13} /> Mark Sent
                              </button>
                            )}
                            <button
                              onClick={() => { onEdit(inv); setMenuOpen(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                            <button
                              onClick={() => { onDelete(inv); setMenuOpen(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            >
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
