import { toDate } from "@/lib/utils/helpers";
import type { VendorRate } from "@/modules/vendor-portal/types";

// Picks the rate active on `date` for a given serviceName; if several
// match, the most recently created wins. No overlap validation happens on
// write (see plan's "explicitly out of scope") — this just picks one
// deterministically at read time. Scoped only to make a future Quotation/
// Package costing integration cheap to wire in later — not wired in yet.
export function findApplicableRate(
  rates: VendorRate[], serviceName: string, date: string
): VendorRate | null {
  const matching = rates.filter((r) => {
    if (r.serviceName !== serviceName) return false;
    if (r.validFrom && date < r.validFrom) return false;
    if (r.validTo && date > r.validTo) return false;
    return true;
  });
  if (matching.length === 0) return null;

  return matching.reduce((latest, rate) => {
    const latestMs = toDate(latest.createdAt)?.getTime() ?? 0;
    const rateMs = toDate(rate.createdAt)?.getTime() ?? 0;
    return rateMs > latestMs ? rate : latest;
  });
}
