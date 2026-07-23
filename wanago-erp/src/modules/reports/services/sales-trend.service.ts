const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type MonthBucket = { year: number; monthIndex: number; label: string };
export type TrendPoint = { month: string; revenue: number; movingAverage: number };

// Trailing monthsBack buckets ending at (and including) the current month,
// oldest first — same shape as dashboard.service.ts's fetchRevenueData,
// generalized so it isn't tied to one specific collection.
export function buildTrailingMonthBuckets(monthsBack: number, now: Date = new Date()): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      year: d.getFullYear(),
      monthIndex: d.getMonth(),
      label: `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
    });
  }
  return buckets;
}

// Sums totalAmount into whichever bucket each booking's confirmedAt date
// falls into; bookings outside every bucket's month are ignored (e.g. a
// booking confirmed further back than the requested window).
export function bucketRevenueByMonth(
  bookings: { totalAmount: number; confirmedAt: Date }[],
  buckets: MonthBucket[]
): number[] {
  return buckets.map((b) =>
    bookings
      .filter((booking) => booking.confirmedAt.getFullYear() === b.year && booking.confirmedAt.getMonth() === b.monthIndex)
      .reduce((sum, booking) => sum + booking.totalAmount, 0)
  );
}

// Trailing moving average — the first (windowSize - 1) points average over
// whatever history is actually available rather than requiring a full
// window, so the series has no leading gap.
export function computeMovingAverage(values: number[], windowSize: number): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    return window.reduce((sum, v) => sum + v, 0) / window.length;
  });
}

// % change, last value vs the one before it. null (not Infinity/NaN) when
// there isn't a previous value to compare against, or it was zero.
export function computeMoMChange(values: number[]): number | null {
  if (values.length < 2) return null;
  const previous = values[values.length - 2];
  const current = values[values.length - 1];
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// % change, current month vs the same month one year (12 buckets) back —
// null if the series isn't long enough to have that comparison point.
export function computeYoYChange(values: number[]): number | null {
  if (values.length < 13) return null;
  const yearAgo = values[values.length - 13];
  const current = values[values.length - 1];
  if (yearAgo === 0) return null;
  return ((current - yearAgo) / yearAgo) * 100;
}

export function buildTrendPoints(buckets: MonthBucket[], revenue: number[], movingAverage: number[]): TrendPoint[] {
  return buckets.map((b, i) => ({ month: b.label, revenue: revenue[i], movingAverage: movingAverage[i] }));
}
