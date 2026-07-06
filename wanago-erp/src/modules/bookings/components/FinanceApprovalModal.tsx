"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Wallet } from "lucide-react";
import { formatAmount } from "@/modules/bookings/components/BookingBadges";
import type { Booking } from "@/modules/bookings/types";

type Props = {
  booking:  Booking | null;
  onClose:  () => void;
  onConfirm: (paymentVerification: "full" | "partial") => Promise<{ error: string | null }>;
};

export function FinanceApprovalModal({ booking, onClose, onConfirm }: Props) {
  const [choice, setChoice]         = useState<"full" | "partial">("full");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    if (booking) { setChoice("full"); setError(null); }
  }, [booking]);

  if (!booking) return null;

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    const { error } = await onConfirm(choice);
    setSubmitting(false);
    if (error) { setError(error); return; }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-md flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Wallet size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Approve as Finance</h2>
              <p className="text-xs text-muted-foreground">{booking.refNumber} · {booking.customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
          )}

          <div className="rounded-xl border border-border px-3 py-2.5 text-sm">
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-muted-foreground">Total Amount</span>
              <span className="font-medium text-foreground">{formatAmount(booking.totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-muted-foreground">Advance Paid</span>
              <span className="font-medium text-foreground">{formatAmount(booking.advanceAmount)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Payment Verification</p>
            <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 cursor-pointer hover:border-primary/40 transition-colors">
              <input type="radio" name="paymentVerification" checked={choice === "full"} onChange={() => setChoice("full")} className="accent-primary" />
              <span className="text-sm text-foreground">Full amount received</span>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 cursor-pointer hover:border-primary/40 transition-colors">
              <input type="radio" name="paymentVerification" checked={choice === "partial"} onChange={() => setChoice("partial")} className="accent-primary" />
              <span className="text-sm text-foreground">Partial advance received</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Confirm Approval
          </button>
        </div>

      </div>
    </div>
  );
}
