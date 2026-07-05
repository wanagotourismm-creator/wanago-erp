"use client";

import { X, Trash2, Wallet, Building2 } from "lucide-react";
import { PaymentMethodBadge, formatAmount } from "@/modules/payments/components/PaymentBadges";
import { formatDate, initials } from "@/lib/utils/helpers";
import type { Payment } from "@/modules/payments/types";

type Props = {
  payment:   Payment | null;
  canManage: boolean;
  onClose:   () => void;
  onDelete:  (payment: Payment) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function PaymentDetailModal({ payment, canManage, onClose, onDelete }: Props) {
  if (!payment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {initials(payment.customerName)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{payment.customerName}</h2>
              <p className="text-xs text-muted-foreground">{payment.refNumber} · Paid {formatDate(payment.paymentDate)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">

          <div className="flex flex-wrap items-center gap-2">
            <PaymentMethodBadge method={payment.paymentMethod} />
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Wallet size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Payment Details</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Amount" value={<span className="font-semibold text-green-600">{formatAmount(payment.amount)}</span>} />
              <Row label="Invoice Ref" value={payment.invoiceRef} />
              <Row label="Reference Number" value={payment.referenceNumber} />
              <Row label="Payment Date" value={formatDate(payment.paymentDate)} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Building2 size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Office</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Office" value={payment.officeName} />
            </div>
          </div>

          {payment.notes && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Notes</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {payment.notes}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        {canManage && (
          <div className="flex items-center justify-end gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
            <button
              onClick={() => onDelete(payment)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
