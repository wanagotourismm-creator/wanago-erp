import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/firebase/client", () => ({
  db: {},
  auth: { currentUser: null },
}));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
}));

import { resolveSegmentMembers } from "./segment.service";
import type { Segment } from "@/modules/journeys/types";
import type { Lead } from "@/modules/leads/types";
import type { Customer } from "@/modules/customers/types";

function lead(overrides: Partial<Lead>): Lead {
  return {
    id: "l1", createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "active",
    name: "Ravi", email: null, phone: "9876543210", alternatePhone: null,
    destination: "Wayanad", tripType: null, travelDate: null, returnDate: null, duration: null, pax: null, budget: null,
    stage: "new", priority: "warm", source: "Instagram", assignedTo: null, agentName: null,
    officeId: "off1", officeName: "Kozhikode", notes: null, lastContactedAt: null, refNumber: "LEAD-1001",
    ...overrides,
  };
}

function customer(overrides: Partial<Customer>): Customer {
  return {
    id: "c1", createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "active",
    fullName: "Jane", email: null, phone: "9876543210", alternatePhone: null,
    customerType: "individual", city: "Dubai", address: null,
    source: "Referral", officeId: "off1", officeName: "Kozhikode",
    notes: null, refNumber: "CUST-1001",
    ...overrides,
  };
}

function segment(overrides: Partial<Segment>): Segment {
  return {
    id: "s1", createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "active",
    name: "Test segment", entityType: "both", filters: {},
    ...overrides,
  };
}

describe("resolveSegmentMembers", () => {
  it("returns everyone matching entityType when filters are empty", () => {
    const members = resolveSegmentMembers(
      segment({ entityType: "both" }),
      { leads: [lead({})], customers: [customer({})], customerSegments: {} }
    );
    expect(members).toHaveLength(2);
  });

  it("filters leads by destination", () => {
    const leads = [lead({ id: "l1", destination: "Wayanad" }), lead({ id: "l2", destination: "Goa" })];
    const members = resolveSegmentMembers(
      segment({ entityType: "lead", filters: { destinationIn: ["Wayanad"] } }),
      { leads, customers: [], customerSegments: {} }
    );
    expect(members).toHaveLength(1);
    expect(members[0].entity.id).toBe("l1");
  });

  it("filters by source across both entity types", () => {
    const leads = [lead({ id: "l1", source: "Instagram" })];
    const customers = [customer({ id: "c1", source: "Referral" })];
    const members = resolveSegmentMembers(
      segment({ entityType: "both", filters: { sourceIn: ["Instagram"] } }),
      { leads, customers, customerSegments: {} }
    );
    expect(members).toHaveLength(1);
    expect(members[0].entityType).toBe("lead");
  });

  it("filters customers by computed segment", () => {
    const customers = [customer({ id: "c1" }), customer({ id: "c2" })];
    const members = resolveSegmentMembers(
      segment({ entityType: "customer", filters: { customerSegmentIn: ["vip"] } }),
      { leads: [], customers, customerSegments: { c1: "vip", c2: "new" } }
    );
    expect(members).toHaveLength(1);
    expect(members[0].entity.id).toBe("c1");
  });

  it("filters customers by city/address substring, case-insensitively", () => {
    const customers = [customer({ id: "c1", city: "Dubai" }), customer({ id: "c2", city: "Mumbai" })];
    const members = resolveSegmentMembers(
      segment({ entityType: "customer", filters: { cityContains: "dubai" } }),
      { leads: [], customers, customerSegments: {} }
    );
    expect(members).toHaveLength(1);
    expect(members[0].entity.id).toBe("c1");
  });

  it("excludes leads entirely when entityType is customer, and vice versa", () => {
    const members = resolveSegmentMembers(
      segment({ entityType: "customer" }),
      { leads: [lead({})], customers: [customer({})], customerSegments: {} }
    );
    expect(members.every((m) => m.entityType === "customer")).toBe(true);
  });
});
