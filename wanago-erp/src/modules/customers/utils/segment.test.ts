import { describe, it, expect } from "vitest";
import { computeCustomerSegment, computeCustomerSegments } from "./segment";
import type { Customer } from "@/modules/customers/types";

function customer(overrides: Partial<Customer>): Customer {
  return {
    id: "c1", createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "active",
    fullName: "Jane Doe", email: null, phone: "9876543210", alternatePhone: null,
    customerType: "individual", city: null, address: null,
    source: "Referral", officeId: "off1", officeName: "Kozhikode",
    notes: null, refNumber: "CUST-1001",
    ...overrides,
  };
}

describe("computeCustomerSegment", () => {
  it("classifies dormant ahead of vip when both would apply", () => {
    const result = computeCustomerSegment({
      enquiryCount: 1, bookingCount: 5, totalBookingValue: 500000,
      lastActivityAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
    });
    expect(result).toBe("dormant");
  });

  it("classifies vip by booking value even with low booking count", () => {
    expect(computeCustomerSegment({ enquiryCount: 1, bookingCount: 1, totalBookingValue: 250000, lastActivityAt: new Date() })).toBe("vip");
  });

  it("classifies repeat when there are 2+ enquiries but no qualifying bookings", () => {
    expect(computeCustomerSegment({ enquiryCount: 2, bookingCount: 0, totalBookingValue: 0, lastActivityAt: new Date() })).toBe("repeat");
  });

  it("classifies new by default", () => {
    expect(computeCustomerSegment({ enquiryCount: 0, bookingCount: 0, totalBookingValue: 0, lastActivityAt: null })).toBe("new");
  });
});

describe("computeCustomerSegments", () => {
  it("aggregates enquiry/booking data per customer and classifies each", () => {
    const customers = [customer({ id: "c1" }), customer({ id: "c2" })];
    const leads = [
      { matchedCustomerId: "c1", createdAt: new Date() },
      { matchedCustomerId: "c1", createdAt: new Date() },
    ];
    const bookings = [
      { customerId: "c1", status: "confirmed", totalAmount: 300000, createdAt: new Date() },
    ];
    const result = computeCustomerSegments(customers, leads, bookings);
    expect(result.c1).toBe("vip"); // booking value alone crosses the VIP threshold
    expect(result.c2).toBe("new"); // no leads/bookings at all
  });

  it("returns an empty object for no customers", () => {
    expect(computeCustomerSegments([], [], [])).toEqual({});
  });
});
