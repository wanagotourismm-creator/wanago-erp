import { describe, it, expect } from "vitest";
import { findApplicableRate, filterActiveRates } from "./vendor-rate-lookup.service";
import type { VendorRate } from "@/modules/vendor-portal/types";

function rate(overrides: Partial<VendorRate>): VendorRate {
  return {
    id: "r1", createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), createdBy: "vendor", status: "active",
    supplierId: "s1", supplierName: "Taj Hotels", serviceName: "Deluxe Double Room",
    description: null, unit: "per night", rateAmount: 5000, currency: "INR",
    validFrom: null, validTo: null, notes: null, submittedByVendor: true,
    ...overrides,
  };
}

describe("findApplicableRate", () => {
  it("returns null when no rate matches the serviceName", () => {
    const rates = [rate({ serviceName: "AC Sedan" })];
    expect(findApplicableRate(rates, "Deluxe Double Room", "2026-08-01")).toBeNull();
  });

  it("applies a rate with no validFrom/validTo regardless of date", () => {
    const r = rate({ validFrom: null, validTo: null });
    expect(findApplicableRate([r], "Deluxe Double Room", "2030-01-01")?.id).toBe("r1");
  });

  it("applies a rate when the date is inside its validFrom/validTo window", () => {
    const r = rate({ validFrom: "2026-08-01", validTo: "2026-08-31" });
    expect(findApplicableRate([r], "Deluxe Double Room", "2026-08-15")?.id).toBe("r1");
  });

  it("excludes a rate when the date is outside its validFrom/validTo window", () => {
    const r = rate({ validFrom: "2026-08-01", validTo: "2026-08-31" });
    expect(findApplicableRate([r], "Deluxe Double Room", "2026-09-01")).toBeNull();
  });

  it("picks the most recently created rate when multiple match", () => {
    const older = rate({ id: "older", createdAt: new Date("2026-01-01"), rateAmount: 4000 });
    const newer = rate({ id: "newer", createdAt: new Date("2026-06-01"), rateAmount: 5500 });
    expect(findApplicableRate([older, newer], "Deluxe Double Room", "2026-08-01")?.id).toBe("newer");
  });
});

describe("filterActiveRates", () => {
  it("includes a rate with no validFrom/validTo regardless of date", () => {
    const r = rate({ validFrom: null, validTo: null });
    expect(filterActiveRates([r], "2030-01-01").map((x) => x.id)).toEqual(["r1"]);
  });

  it("includes a rate when the date is inside its validFrom/validTo window", () => {
    const r = rate({ validFrom: "2026-08-01", validTo: "2026-08-31" });
    expect(filterActiveRates([r], "2026-08-15").map((x) => x.id)).toEqual(["r1"]);
  });

  it("excludes a rate when the date is before its validFrom", () => {
    const r = rate({ validFrom: "2026-08-01", validTo: "2026-08-31" });
    expect(filterActiveRates([r], "2026-07-01")).toEqual([]);
  });

  it("excludes a rate when the date is after its validTo", () => {
    const r = rate({ validFrom: "2026-08-01", validTo: "2026-08-31" });
    expect(filterActiveRates([r], "2026-09-01")).toEqual([]);
  });

  it("filters a mixed list down to only the currently-active rates", () => {
    const active = rate({ id: "active", validFrom: "2026-08-01", validTo: "2026-08-31" });
    const expired = rate({ id: "expired", validFrom: "2026-01-01", validTo: "2026-01-31" });
    const openEnded = rate({ id: "open-ended", validFrom: null, validTo: null });
    expect(filterActiveRates([active, expired, openEnded], "2026-08-15").map((x) => x.id).sort())
      .toEqual(["active", "open-ended"]);
  });
});
