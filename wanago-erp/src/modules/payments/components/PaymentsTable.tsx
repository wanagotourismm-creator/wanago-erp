"use client";

import { Trash2 } from "lucide-react";
import { PaymentMethodBadge, formatAmount } from "@/modules/payments/components/PaymentBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate, initials } from "@/lib/utils/helpers";
import type { Payment } from "@/modules/payments/types";

type Props = {
  payments:  Payment[];
  loading:   boolean;
  canManage: boolean;
  onDelete:  (payment: Payment) => void;
};

export function PaymentsTable({ payments, loading, canManage, onDelete }: Props) {
  if (loading) return <SkeletonTable rows={6} />;

  if (payments.length === 0) {
    return (
      <EmptyState
        title="No payments recorded yet"
        description="Record your first payment to get started"
        icon={<span className="text-2xl">💳</span>}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Customer", "Invoice", "Amount", "Method", "Reference", "Date", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-muted/20 transition-colors group">

                {/* Customer + ref */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(p.customerName)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{p.customerName}</p>
                      <p className="text-[11px] text-muted-foreground">{p.refNumber}</p>
                    </div>
                  </div>
                </td>

                {/* Invoice */}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{p.invoiceRef || "—"}</span>
                </td>

                {/* Amount */}
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-green-600">{formatAmount(p.amount)}</span>
                </td>

                {/* Method */}
                <td className="px-4 py-3">
                  <PaymentMethodBadge method={p.paymentMethod} />
                </td>

                {/* Reference */}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{p.referenceNumber || "—"}</span>
                </td>

                {/* Date */}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(p.paymentDate)}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  {canManage && (
                    <button
                      onClick={() => onDelete(p)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
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
