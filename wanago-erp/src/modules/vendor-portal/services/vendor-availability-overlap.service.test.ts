import { describe, it, expect } from "vitest";
import { findOverlappingAvailability } from "./vendor-availability-overlap.service";
import type { VendorAvailability } from "@/modules/vendor-portal/types";

function availability(overrides: Partial<VendorAvailability>): VendorAvailability {
  return {
    id: "a1", createdAt: new Date(), updatedAt: new Date(), createdBy: "vendor", status: "active",
    supplierId: "s1", supplierName: "Taj Hotels", resourceLabel: "Standard Rooms",
    startDate: "2026-08-01", endDate: "2026-08-05", unitsAvailable: 10, notes: null,
    submittedByVendor: true,
    ...overrides,
  };
}

describe("findOverlappingAvailability", () => {
  it("returns empty when there is only one entry", () => {
    expect(findOverlappingAvailability([availability({ id: "a1" })])).toEqual([]);
  });

  it("returns empty when date ranges don't overlap", () => {
    const a = availability({ id: "a1", startDate: "2026-08-01", endDate: "2026-08-05" });
    const b = availability({ id: "a2", startDate: "2026-08-06", endDate: "2026-08-10" });
    expect(findOverlappingAvailability([a, b])).toEqual([]);
  });

  it("detects an exact overlap", () => {
    const a = availability({ id: "a1", startDate: "2026-08-01", endDate: "2026-08-05" });
    const b = availability({ id: "a2", startDate: "2026-08-01", endDate: "2026-08-05" });
    expect(findOverlappingAvailability([a, b])).toHaveLength(1);
  });

  it("detects a partial overlap", () => {
    const a = availability({ id: "a1", startDate: "2026-08-01", endDate: "2026-08-05" });
    const b = availability({ id: "a2", startDate: "2026-08-03", endDate: "2026-08-08" });
    const result = findOverlappingAvailability([a, b]);
    expect(result).toHaveLength(1);
    expect(result[0].map((e) => e.id)).toEqual(["a1", "a2"]);
  });

  it("does not report an overlap for different resourceLabels", () => {
    const a = availability({ id: "a1", resourceLabel: "Standard Rooms", startDate: "2026-08-01", endDate: "2026-08-05" });
    const b = availability({ id: "a2", resourceLabel: "Deluxe Rooms", startDate: "2026-08-01", endDate: "2026-08-05" });
    expect(findOverlappingAvailability([a, b])).toEqual([]);
  });

  it("does not report an overlap for different suppliers with the same resourceLabel", () => {
    const a = availability({ id: "a1", supplierId: "s1", startDate: "2026-08-01", endDate: "2026-08-05" });
    const b = availability({ id: "a2", supplierId: "s2", startDate: "2026-08-01", endDate: "2026-08-05" });
    expect(findOverlappingAvailability([a, b])).toEqual([]);
  });

  it("treats a touching boundary (one starts the day the other ends) as an overlap", () => {
    const a = availability({ id: "a1", startDate: "2026-08-01", endDate: "2026-08-05" });
    const b = availability({ id: "a2", startDate: "2026-08-05", endDate: "2026-08-08" });
    expect(findOverlappingAvailability([a, b])).toHaveLength(1);
  });
});
