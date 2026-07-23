"use client";

import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { useExpenses } from "@/modules/expenses/hooks/useExpenses";
import { usePackages } from "@/modules/packages/hooks/usePackages";
import { computeTripProfitability } from "@/modules/profitability/services/trip-profitability.service";
import { formatAmount } from "@/modules/bookings/components/BookingBadges";
import { cn } from "@/lib/utils/helpers";
import type { Booking } from "@/modules/bookings/types";

// Mounted inside BookingDetailModal, same idiom as BookingResourcesSection/
// BookingSosHistory — fetches this trip's linked expenses/package
// client-side (fetch-all + filter, same as those two) rather than adding a
// new server-filtered query. Read-only: this is a transparency view, not a
// way to edit anything.
export function TripProfitabilitySection({ booking }: { booking: Booking }) {
  const { expenses, loading: expensesLoading } = useExpenses();
  const { packages, loading: packagesLoading } = usePackages();

  const linkedExpenses = useMemo(
    () => expenses.filter((e) => e.bookingId === booking.id && (e.expenseStatus === "approved" || e.expenseStatus === "paid")),
    [expenses, booking.id]
  );

  const pkg = useMemo(
    () => booking.packageId ? packages.find((p) => p.id === booking.packageId) ?? null : null,
    [packages, booking.packageId]
  );

  const result = useMemo(
    () => computeTripProfitability({
      totalAmount: booking.totalAmount,
      packageCostPrice: pkg?.costPrice ?? null,
      linkedExpenseAmounts: linkedExpenses.map((e) => e.amount),
    }),
    [booking.totalAmount, pkg, linkedExpenses]
  );

  if (expensesLoading || packagesLoading) return null;

  const recordedProfit = booking.profitAmount;
  const hasVariance = recordedProfit != null && recordedProfit !== result.computedProfit;

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <TrendingUp size={13} className="text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Trip P&amp;L</p>
      </div>
      <div className="divide-y divide-border rounded-xl border border-border px-3">
        <div className="flex items-center justify-between gap-3 py-2">
          <span className="text-xs text-muted-foreground">Total Amount</span>
          <span className="text-sm font-medium text-foreground">{formatAmount(result.revenue)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 py-2">
          <span className="text-xs text-muted-foreground">Package Cost</span>
          <span className="text-sm font-medium text-foreground">{pkg ? formatAmount(result.packageCost) : "—"}</span>
        </div>
        {linkedExpenses.length > 0 && (
          <div className="py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">Linked Expenses</span>
              <span className="text-sm font-medium text-foreground">{formatAmount(result.extraExpensesCost)}</span>
            </div>
            <div className="mt-1.5 space-y-1 pl-2">
              {linkedExpenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                  <span className="truncate">{e.category} — {e.description}</span>
                  <span className="flex-shrink-0">{formatAmount(e.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 py-2">
          <span className="text-xs font-semibold text-muted-foreground">Computed Profit</span>
          <span className={cn("text-sm font-semibold", result.computedProfit < 0 ? "text-destructive" : "text-foreground")}>
            {formatAmount(result.computedProfit)}
          </span>
        </div>
        {recordedProfit != null && (
          <div className="flex items-center justify-between gap-3 py-2">
            <span className="text-xs text-muted-foreground">Recorded Profit (Ops)</span>
            <span className="text-sm font-medium text-foreground">{formatAmount(recordedProfit)}</span>
          </div>
        )}
      </div>
      {hasVariance && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Recorded profit differs from the computed figure — the computed figure doesn&apos;t know about anything not linked here (e.g. vendor costs not logged as an Expense).
        </p>
      )}
    </div>
  );
}
