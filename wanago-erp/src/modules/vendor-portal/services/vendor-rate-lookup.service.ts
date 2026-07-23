import { toDate } from "@/lib/utils/helpers";
import type { VendorRate } from "@/modules/vendor-portal/types";

function isRateActiveOn(rate: VendorRate, date: string): boolean {
  if (rate.validFrom && date < rate.validFrom) return false;
  if (rate.validTo && date > rate.validTo) return false;
  return true;
}

// Picks the rate active on `date` for a given serviceName; if several
// match, the most recently created wins. No overlap validation happens on
// write (see plan's "explicitly out of scope") — this just picks one
// deterministically at read time. Scoped only to make a future Quotation/
// Package costing integration cheap to wire in later — not wired in yet.
export function findApplicableRate(
  rates: VendorRate[], serviceName: string, date: string
): VendorRate | null {
  const matching = rates.filter((r) => r.serviceName === serviceName && isRateActiveOn(r, date));
  if (matching.length === 0) return null;

  return matching.reduce((latest, rate) => {
    const latestMs = toDate(latest.createdAt)?.getTime() ?? 0;
    const rateMs = toDate(rate.createdAt)?.getTime() ?? 0;
    return rateMs > latestMs ? rate : latest;
  });
}

// All rates valid on `date` (not collapsed to one-per-serviceName like
// findApplicableRate above) — used by VendorRatePicker to filter its list
// down to currently-applicable rates by default, hiding expired/future ones.
export function filterActiveRates(rates: VendorRate[], date: string): VendorRate[] {
  return rates.filter((r) => isRateActiveOn(r, date));
}
