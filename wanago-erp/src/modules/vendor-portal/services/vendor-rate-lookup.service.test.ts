import { describe, it, expect } from "vitest";
import { findApplicableRate } from "./vendor-rate-lookup.service";
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
