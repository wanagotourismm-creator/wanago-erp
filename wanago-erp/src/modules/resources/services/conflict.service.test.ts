import { describe, it, expect } from "vitest";
import { dateRangesOverlap, findConflicts, computeUtilization } from "./conflict.service";
import type { ResourceAssignment, ResourceBlackout } from "@/modules/resources/types";

function assignment(overrides: Partial<ResourceAssignment>): ResourceAssignment {
  return {
    id: "a1", createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "active",
    resourceId: "r1", resourceName: "Innova KL-11-AB-1234", resourceType: "vehicle",
    bookingId: "b1", bookingRefNumber: "WGO-1001", customerName: "Jane Doe",
    startDate: "2026-08-01", endDate: "2026-08-05", notes: null,
    ...overrides,
  };
}

function blackout(overrides: Partial<ResourceBlackout>): ResourceBlackout {
  return {
    id: "bo1", createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "active",
    resourceId: "r1", resourceName: "Innova KL-11-AB-1234",
    startDate: "2026-08-10", endDate: "2026-08-12", reason: "Maintenance",
    ...overrides,
  };
}

describe("dateRangesOverlap", () => {
  it("returns true when ranges overlap fully", () => {
    expect(dateRangesOverlap({ startDate: "2026-08-01", endDate: "2026-08-05" }, { startDate: "2026-08-03", endDate: "2026-08-04" })).toBe(true);
  });

  it("returns true for an exact boundary-day overlap (one starts the day the other ends)", () => {
    expect(dateRangesOverlap({ startDate: "2026-08-01", endDate: "2026-08-05" }, { startDate: "2026-08-05", endDate: "2026-08-08" })).toBe(true);
  });

  it("returns false for adjacent-but-not-overlapping ranges", () => {
    expect(dateRangesOverlap({ startDate: "2026-08-01", endDate: "2026-08-05" }, { startDate: "2026-08-06", endDate: "2026-08-08" })).toBe(false);
  });

  it("returns true when one range is fully inside another", () => {
    expect(dateRangesOverlap({ startDate: "2026-08-01", endDate: "2026-08-31" }, { startDate: "2026-08-10", endDate: "2026-08-12" })).toBe(true);
  });
});

describe("findConflicts", () => {
  it("returns empty when the resource is free", () => {
    const conflicts = findConflicts("r1", { startDate: "2026-09-01", endDate: "2026-09-05" }, [assignment({})], [blackout({})]);
    expect(conflicts).toEqual([]);
  });

  it("flags an overlapping assignment on the same resource", () => {
    const a = assignment({});
    const conflicts = findConflicts("r1", { startDate: "2026-08-03", endDate: "2026-08-04" }, [a], []);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({ type: "assignment", assignment: a });
  });

  it("ignores assignments on a different resource", () => {
    const conflicts = findConflicts("r2", { startDate: "2026-08-03", endDate: "2026-08-04" }, [assignment({ resourceId: "r1" })], []);
    expect(conflicts).toEqual([]);
  });

  it("flags an overlapping blackout", () => {
    const conflicts = findConflicts("r1", { startDate: "2026-08-11", endDate: "2026-08-11" }, [], [blackout({})]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe("blackout");
  });

  it("excludes the assignment being edited from its own conflict check", () => {
    const existing = assignment({ id: "a1" });
    const conflicts = findConflicts("r1", { startDate: "2026-08-03", endDate: "2026-08-04" }, [existing], [], "a1");
    expect(conflicts).toEqual([]);
  });
});

describe("computeUtilization", () => {
  it("returns 0 with no assignments", () => {
    expect(computeUtilization("r1", [], { startDate: "2026-08-01", endDate: "2026-08-31" })).toBe(0);
  });

  it("returns 100 when fully booked across the period", () => {
    const util = computeUtilization("r1", [assignment({ startDate: "2026-08-01", endDate: "2026-08-31" })], { startDate: "2026-08-01", endDate: "2026-08-31" });
    expect(util).toBe(100);
  });

  it("clamps an assignment that extends past the period edges", () => {
    // Period is Aug 1-10 (10 days); assignment runs Jul 25 - Aug 5, so only
    // Aug 1-5 (5 days) should count => 50%.
    const util = computeUtilization("r1", [assignment({ startDate: "2026-07-25", endDate: "2026-08-05" })], { startDate: "2026-08-01", endDate: "2026-08-10" });
    expect(util).toBe(50);
  });

  it("ignores assignments for a different resource", () => {
    const util = computeUtilization("r2", [assignment({ resourceId: "r1" })], { startDate: "2026-08-01", endDate: "2026-08-31" });
    expect(util).toBe(0);
  });
});
