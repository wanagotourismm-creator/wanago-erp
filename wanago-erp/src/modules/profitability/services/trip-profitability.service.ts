export type TripProfitabilityInput = {
  totalAmount: number;              // Booking.totalAmount — the agreed revenue figure
  packageCostPrice: number | null;  // Package.costPrice if linked, else null
  // Amounts of Expenses linked to this booking, already status-filtered by
  // the caller (approved/paid only — same filter computeCashPosition
  // already uses for real, not merely logged, spend).
  linkedExpenseAmounts: number[];
};

export type TripProfitability = {
  revenue: number;
  packageCost: number;
  extraExpensesCost: number;
  computedProfit: number;
};

// No internal general ledger exists (Tally remains the real one) — this is
// the honest, small-scope replacement for Booking.profitAmount's fully
// manual entry: a real computed profit from whatever's actually linkable
// today (the package's flat cost + any Expenses staff explicitly tagged to
// this booking). Vendor rates/Resources aren't included — no reliable join
// exists from ResourceAssignment/Resource to VendorRate (both free text,
// no shared key).
export function computeTripProfitability(input: TripProfitabilityInput): TripProfitability {
  const packageCost = input.packageCostPrice ?? 0;
  const extraExpensesCost = input.linkedExpenseAmounts.reduce((sum, amount) => sum + amount, 0);
  const computedProfit = input.totalAmount - packageCost - extraExpensesCost;
  return { revenue: input.totalAmount, packageCost, extraExpensesCost, computedProfit };
}
