// Rule-based / statistical baselines only — no trained ML model. These are
// intentionally simple (moving averages, gap analysis, basic z-scores)
// because the real thing (BigQuery ML / AutoML for churn and anomaly
// detection) needs far more historical volume than this business has yet
// to be reliable. Revisit once there's a few years of booking history —
// see RevenueForecast.tsx for the same honesty pattern already applied to
// sales forecasting.
import { toDate } from "@/lib/utils/helpers";
import type { Booking } from "@/modules/bookings/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export type GoingColdCustomer = {
  customerId: string;
  customerName: string;
  lastBookingAt: Date;
  daysSinceLast: number;
  avgGapDays: number;
};

// Flags repeat customers (2+ confirmed/completed bookings) whose time since
// their last booking has significantly exceeded their own historical
// booking rhythm — e.g. someone who books every ~4 months and hasn't in 9.
// A minimum 60-day floor keeps frequent bookers (weekly/monthly patterns)
// from being flagged just because they're a few days later than usual.
export function computeGoingColdCustomers(bookings: Booking[], limit = 8): GoingColdCustomer[] {
  const byCustomer = new Map<string, { name: string; dates: Date[] }>();

  for (const b of bookings) {
    if (b.status !== "confirmed" && b.status !== "completed") continue;
    const date = toDate(b.createdAt);
    if (!date) continue;
    const existing = byCustomer.get(b.customerId);
    if (existing) existing.dates.push(date);
    else byCustomer.set(b.customerId, { name: b.customerName, dates: [date] });
  }

  const now = Date.now();
  const results: GoingColdCustomer[] = [];

  for (const [customerId, { name, dates }] of byCustomer) {
    if (dates.length < 2) continue;
    dates.sort((a, b) => a.getTime() - b.getTime());

    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      gaps.push((dates[i].getTime() - dates[i - 1].getTime()) / DAY_MS);
    }
    const avgGapDays = gaps.reduce((s, g) => s + g, 0) / gaps.length;

    const lastBookingAt = dates[dates.length - 1];
    const daysSinceLast = (now - lastBookingAt.getTime()) / DAY_MS;

    const threshold = Math.max(avgGapDays * 1.5, 60);
    if (daysSinceLast > threshold) {
      results.push({ customerId, customerName: name, lastBookingAt, daysSinceLast: Math.round(daysSinceLast), avgGapDays: Math.round(avgGapDays) });
    }
  }

  // Most overdue relative to the customer's own rhythm first, not just
  // most overdue in absolute days — a customer who's 2x late on a 20-day
  // cycle is a stronger signal than one who's 1.2x late on a 200-day cycle.
  results.sort((a, b) => (b.daysSinceLast / b.avgGapDays) - (a.daysSinceLast / a.avgGapDays));
  return results.slice(0, limit);
}

export type Anomaly = { message: string; severity: "warning" | "info" };

// Compares the trailing 7 days against the prior 7-30 day baseline —
// simple enough to explain in one sentence, which matters more than
// statistical sophistication when the audience is a founder skimming a
// dashboard, not a data scientist. Thresholds are deliberately conservative
// (needs a real multiple, not just "slightly more than usual") to avoid
// crying wolf on small-sample noise.
export function computeBookingAnomalies(bookings: Booking[]): Anomaly[] {
  const now = Date.now();
  const anomalies: Anomaly[] = [];

  const withDates = bookings
    .map(b => ({ b, date: toDate(b.createdAt) }))
    .filter((x): x is { b: Booking; date: Date } => x.date !== null);

  const last7 = withDates.filter(x => now - x.date.getTime() <= 7 * DAY_MS);
  const prior23 = withDates.filter(x => {
    const age = now - x.date.getTime();
    return age > 7 * DAY_MS && age <= 30 * DAY_MS;
  });

  // Cancellation spike
  const last7Cancelled = last7.filter(x => x.b.status === "cancelled").length;
  const priorCancelRate = prior23.length > 0
    ? prior23.filter(x => x.b.status === "cancelled").length / prior23.length
    : 0;
  const last7CancelRate = last7.length > 0 ? last7Cancelled / last7.length : 0;
  if (last7Cancelled >= 3 && priorCancelRate >= 0 && last7CancelRate > Math.max(priorCancelRate * 2, 0.25)) {
    anomalies.push({
      message: `${last7Cancelled} cancellations in the last 7 days — noticeably higher than the recent baseline.`,
      severity: "warning",
    });
  }

  // Revenue drop
  const last7Revenue = last7.filter(x => x.b.status === "confirmed" || x.b.status === "completed")
    .reduce((s, x) => s + (x.b.totalAmount ?? 0), 0);
  const priorWeeklyAvgRevenue = prior23.length > 0
    ? (prior23.filter(x => x.b.status === "confirmed" || x.b.status === "completed").reduce((s, x) => s + (x.b.totalAmount ?? 0), 0) / 23) * 7
    : 0;
  if (priorWeeklyAvgRevenue > 0 && last7Revenue < priorWeeklyAvgRevenue * 0.5) {
    const pct = Math.round((1 - last7Revenue / priorWeeklyAvgRevenue) * 100);
    anomalies.push({
      message: `This week's confirmed revenue is ${pct}% below the recent weekly average — worth a look.`,
      severity: "warning",
    });
  }

  return anomalies;
}
