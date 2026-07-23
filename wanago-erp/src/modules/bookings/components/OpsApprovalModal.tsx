"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Loader2, Briefcase } from "lucide-react";
import { formatAmount } from "@/modules/bookings/components/BookingBadges";
import { computeTripProfitability } from "@/modules/profitability/services/trip-profitability.service";
import type { Booking } from "@/modules/bookings/types";
import type { Package } from "@/modules/packages/types";
import type { Expense } from "@/modules/expenses/types";

type Props = {
  booking:  Booking | null;
  packages: Package[];
  expenses: Expense[];
  onClose:  () => void;
  onConfirm: (profitAmount: number) => Promise<{ error: string | null }>;
};

export function OpsApprovalModal({ booking, packages, expenses, onClose, onConfirm }: Props) {
  const [profitAmount, setProfitAmount] = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const suggestion = useMemo(() => {
    if (!booking) return null;
    const pkg = booking.packageId ? packages.find(p => p.id === booking.packageId) : null;
    const linkedExpenseAmounts = expenses
      .filter(e => e.bookingId === booking.id && (e.expenseStatus === "approved" || e.expenseStatus === "paid"))
      .map(e => e.amount);
    // No real cost data at all (no package, no linked expenses) — same as
    // before, don't suggest a number that would just be totalAmount minus
    // zero and imply the trip costs nothing.
    if (!pkg && linkedExpenseAmounts.length === 0) return null;
    return computeTripProfitability({
      totalAmount: booking.totalAmount,
      packageCostPrice: pkg?.costPrice ?? null,
      linkedExpenseAmounts,
    }).computedProfit;
  }, [booking, packages, expenses]);

  useEffect(() => {
    if (booking) {
      setProfitAmount(suggestion != null ? String(suggestion) : "");
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking]);

  if (!booking) return null;

  async function handleConfirm() {
    if (!booking) return;
    const amount = Number(profitAmount);
    if (profitAmount.trim() === "" || Number.isNaN(amount)) {
      setError("Enter a valid profit amount");
      return;
    }
    if (amount < 0) {
      setError("Profit can't be negative");
      return;
    }
    if (amount > booking.totalAmount) {
      setError("Profit can't exceed the booking's total amount");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error } = await onConfirm(amount);
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
              <Briefcase size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Approve as Operations</h2>
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
            {booking.packageName && (
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-muted-foreground">Package</span>
                <span className="font-medium text-foreground">{booking.packageName}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Profit (₹)</label>
            <input
              type="number"
              value={profitAmount}
              onChange={(e) => setProfitAmount(e.target.value)}
              placeholder={suggestion != null ? String(suggestion) : "Enter profit amount"}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
            />
            {suggestion != null && (
              <p className="text-[11px] text-muted-foreground">Suggested (package cost + any linked expenses, subtracted from Total Amount): {formatAmount(suggestion)}</p>
            )}
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
