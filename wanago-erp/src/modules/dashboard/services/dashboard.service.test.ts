import { describe, it, expect, vi } from "vitest";

// This file also exports Firestore-touching functions (fetchDashboardRawData
// etc.) that eagerly initialize the Firebase app at import time — the
// compute functions under test here are pure, but importing the module at
// all pulls that in, so it's mocked the same way repository.test.ts does.
vi.mock("@/lib/firebase/client", () => ({
  db: {},
  auth: { currentUser: null },
}));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
}));

import {
  computeCashPosition,
  computeGrossMargin,
  computePipelineValue,
  computeArOverdue,
  computeCockpitAlerts,
  computeResourceAvailabilityAlerts,
} from "./dashboard.service";
import type { CockpitFilters } from "@/modules/dashboard/types";

const RANGE: CockpitFilters = {
  officeId:   "all",
  rangeStart: new Date("2026-07-01T00:00:00Z"),
  rangeEnd:   new Date("2026-07-31T23:59:59Z"),
};

function ts(iso: string) {
  return { createdAt: { seconds: new Date(iso).getTime() / 1000, nanoseconds: 0 } };
}

describe("computeCashPosition", () => {
  it("nets payments in minus paid expenses, within range", () => {
    const payments = [
      { amount: 10000, ...ts("2026-07-10") },
      { amount: 5000,  ...ts("2026-07-15") },
    ];
    const expenses = [
      { amount: 3000, expenseStatus: "paid",    ...ts("2026-07-12") },
      { amount: 2000, expenseStatus: "pending", ...ts("2026-07-12") }, // unpaid — excluded
    ];
    expect(computeCashPosition(payments, expenses, RANGE)).toBe(10000 + 5000 - 3000);
  });

  it("excludes docs outside the date range", () => {
    const payments = [
      { amount: 10000, ...ts("2026-07-10") },
      { amount: 99999, ...ts("2026-06-01") }, // before range
    ];
    expect(computeCashPosition(payments, [], RANGE)).toBe(10000);
  });

  it("filters by office when officeId is not 'all'", () => {
    const payments = [
      { amount: 10000, officeId: "kozhikode", ...ts("2026-07-10") },
      { amount: 5000,  officeId: "wayanad",   ...ts("2026-07-10") },
    ];
    const filters: CockpitFilters = { ...RANGE, officeId: "kozhikode" };
    expect(computeCashPosition(payments, [], filters)).toBe(10000);
  });

  it("returns 0 for no data", () => {
    expect(computeCashPosition([], [], RANGE)).toBe(0);
  });
});

describe("computeGrossMargin", () => {
  it("computes total profit over total revenue as a percentage", () => {
    const bookings = [
      { status: "confirmed", totalAmount: 100000, profitAmount: 20000, ...ts("2026-07-10") },
      { status: "completed", totalAmount: 50000,  profitAmount: 5000,  ...ts("2026-07-12") },
    ];
    expect(computeGrossMargin(bookings, RANGE)).toBeCloseTo((25000 / 150000) * 100, 5);
  });

  it("ignores bookings without a profitAmount set yet", () => {
    const bookings = [
      { status: "confirmed", totalAmount: 100000, profitAmount: 20000, ...ts("2026-07-10") },
      { status: "ops_pending", totalAmount: 50000, profitAmount: null, ...ts("2026-07-12") },
    ];
    expect(computeGrossMargin(bookings, RANGE)).toBeCloseTo(20, 5);
  });

  it("returns null when no eligible bookings exist", () => {
    expect(computeGrossMargin([], RANGE)).toBeNull();
    expect(computeGrossMargin([{ status: "ops_pending", ...ts("2026-07-10") }], RANGE)).toBeNull();
  });
});

describe("computePipelineValue", () => {
  it("sums budget for leads not won/lost", () => {
    const leads = [
      { stage: "new",         budget: 50000 },
      { stage: "negotiation", budget: 75000 },
      { stage: "won",         budget: 200000 }, // excluded
      { stage: "lost",        budget: 30000 },  // excluded
    ];
    expect(computePipelineValue(leads, "all")).toBe(125000);
  });

  it("filters by office", () => {
    const leads = [
      { stage: "new", budget: 50000, officeId: "kozhikode" },
      { stage: "new", budget: 75000, officeId: "wayanad" },
    ];
    expect(computePipelineValue(leads, "wayanad")).toBe(75000);
  });
});

describe("computeArOverdue", () => {
  it("sums balanceDue for overdue invoices only", () => {
    const invoices = [
      { status: "overdue", balanceDue: 12000 },
      { status: "paid",    balanceDue: 0 },
      { status: "partial", balanceDue: 5000 },
    ];
    expect(computeArOverdue(invoices, "all")).toBe(12000);
  });
});

describe("computeCockpitAlerts", () => {
  it("flags overdue invoices with a deep link", () => {
    const invoices = [{ id: "inv_1", status: "overdue", refNumber: "INV-0001", customerName: "Jane", balanceDue: 4000 }];
    const alerts = computeCockpitAlerts(invoices, []);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ type: "overdue_invoice", href: "/invoices?view=inv_1", severity: "high" });
  });

  it("flags negative-margin bookings with a deep link", () => {
    const bookings = [{ id: "bk_1", refNumber: "BK-0001", customerName: "Ravi", profitAmount: -1500 }];
    const alerts = computeCockpitAlerts([], bookings);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ type: "negative_margin_booking", href: "/bookings?view=bk_1", severity: "medium" });
  });

  it("ignores paid invoices and non-negative-margin bookings", () => {
    const invoices = [{ id: "inv_2", status: "paid", balanceDue: 0 }];
    const bookings = [{ id: "bk_2", profitAmount: 3000 }, { id: "bk_3", profitAmount: null }];
    expect(computeCockpitAlerts(invoices, bookings)).toHaveLength(0);
  });

  it("sorts high-severity alerts before medium", () => {
    const invoices = [{ id: "inv_3", status: "overdue", balanceDue: 1000 }];
    const bookings = [{ id: "bk_4", profitAmount: -500 }];
    const alerts = computeCockpitAlerts(invoices, bookings);
    expect(alerts.map(a => a.severity)).toEqual(["high", "medium"]);
  });

  it("returns an empty list when nothing is amiss", () => {
    expect(computeCockpitAlerts([], [])).toEqual([]);
  });
});

describe("computeResourceAvailabilityAlerts", () => {
  const NOW = new Date("2026-08-01T00:00:00Z");

  it("flags a (type, office) group where every active resource is busy the coming week", () => {
    const resources = [{ id: "r1", type: "vehicle", officeId: "off1", officeName: "Kozhikode", isActive: true }];
    const assignments = [{ resourceId: "r1", startDate: "2026-08-02", endDate: "2026-08-03" }];
    const alerts = computeResourceAvailabilityAlerts(resources, assignments, [], NOW);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ type: "low_resource_availability", href: "/resources" });
  });

  it("does not flag a group with at least one free resource", () => {
    const resources = [
      { id: "r1", type: "vehicle", officeId: "off1", officeName: "Kozhikode", isActive: true },
      { id: "r2", type: "vehicle", officeId: "off1", officeName: "Kozhikode", isActive: true },
    ];
    const assignments = [{ resourceId: "r1", startDate: "2026-08-02", endDate: "2026-08-03" }];
    expect(computeResourceAvailabilityAlerts(resources, assignments, [], NOW)).toEqual([]);
  });

  it("ignores inactive resources entirely", () => {
    const resources = [{ id: "r1", type: "vehicle", officeId: "off1", officeName: "Kozhikode", isActive: false }];
    expect(computeResourceAvailabilityAlerts(resources, [], [], NOW)).toEqual([]);
  });

  it("counts a blackout the same as an assignment", () => {
    const resources = [{ id: "r1", type: "guide", officeId: "off1", officeName: "Kozhikode", isActive: true }];
    const blackouts = [{ resourceId: "r1", startDate: "2026-08-05", endDate: "2026-08-06" }];
    const alerts = computeResourceAvailabilityAlerts(resources, [], blackouts, NOW);
    expect(alerts).toHaveLength(1);
  });

  it("does not flag a resource whose conflict is outside the 7-day horizon", () => {
    const resources = [{ id: "r1", type: "vehicle", officeId: "off1", officeName: "Kozhikode", isActive: true }];
    const assignments = [{ resourceId: "r1", startDate: "2026-09-01", endDate: "2026-09-02" }];
    expect(computeResourceAvailabilityAlerts(resources, assignments, [], NOW)).toEqual([]);
  });
});
