// Customer segmentation — a single, shared rule so the Customers list,
// detail page, and journey/segment targeting (src/modules/journeys) all
// agree on what "VIP" or "Dormant" means, rather than each screen
// inventing its own threshold.
import type { DocumentData } from "firebase/firestore";
import { toDate } from "@/lib/utils/helpers";
import { BOOKING_STATUS } from "@/lib/constants";
import type { Customer } from "@/modules/customers/types";

export type CustomerSegment = "new" | "repeat" | "vip" | "dormant";

const VIP_BOOKING_COUNT_THRESHOLD = 3;
const VIP_TOTAL_VALUE_THRESHOLD = 200_000; // INR, confirmed/completed bookings only
const DORMANT_MONTHS = 12;

export type CustomerSegmentInput = {
  enquiryCount:      number;
  bookingCount:      number;
  totalBookingValue: number; // sum of totalAmount for confirmed/completed bookings only
  lastActivityAt:    Date | null; // most recent enquiry or booking date
};

// Dormant takes priority over VIP — a big-spending customer who hasn't
// been active in a year is exactly who a "win back" campaign should
// target, so it's more useful surfaced as Dormant than silently staying VIP.
export function computeCustomerSegment(input: CustomerSegmentInput): CustomerSegment {
  if (input.lastActivityAt) {
    const monthsInactive =
      (Date.now() - input.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsInactive >= DORMANT_MONTHS) return "dormant";
  }
  if (input.bookingCount >= VIP_BOOKING_COUNT_THRESHOLD || input.totalBookingValue >= VIP_TOTAL_VALUE_THRESHOLD) {
    return "vip";
  }
  if (input.enquiryCount >= 2) return "repeat";
  return "new";
}

// Extracted from CustomersPage.tsx (previously inlined there only) so the
// journeys module's segment resolver can reuse the exact same aggregation
// instead of re-deriving it — enquiry count from matched Leads, booking
// count/value/recency from Bookings, one CustomerSegment per customer.
export function computeCustomerSegments(
  customers: Customer[], leads: DocumentData[], bookings: DocumentData[]
): Record<string, CustomerSegment> {
  const enquiryCounts: Record<string, number> = {};
  const lastEnquiryAt: Record<string, Date> = {};
  for (const lead of leads) {
    if (!lead.matchedCustomerId) continue;
    enquiryCounts[lead.matchedCustomerId] = (enquiryCounts[lead.matchedCustomerId] ?? 0) + 1;
    const created = toDate(lead.createdAt);
    if (created && (!lastEnquiryAt[lead.matchedCustomerId] || created > lastEnquiryAt[lead.matchedCustomerId])) {
      lastEnquiryAt[lead.matchedCustomerId] = created;
    }
  }

  const bookingCounts: Record<string, number> = {};
  const bookingValues: Record<string, number> = {};
  const lastBookingAt: Record<string, Date> = {};
  for (const booking of bookings) {
    const created = toDate(booking.createdAt);
    if (created && (!lastBookingAt[booking.customerId] || created > lastBookingAt[booking.customerId])) {
      lastBookingAt[booking.customerId] = created;
    }
    if (booking.status === BOOKING_STATUS.CONFIRMED || booking.status === BOOKING_STATUS.COMPLETED) {
      bookingCounts[booking.customerId] = (bookingCounts[booking.customerId] ?? 0) + 1;
      bookingValues[booking.customerId] = (bookingValues[booking.customerId] ?? 0) + booking.totalAmount;
    }
  }

  const segments: Record<string, CustomerSegment> = {};
  for (const customer of customers) {
    const lastActivityAt = [lastEnquiryAt[customer.id], lastBookingAt[customer.id]]
      .filter((d): d is Date => !!d)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    segments[customer.id] = computeCustomerSegment({
      enquiryCount:      enquiryCounts[customer.id] ?? 0,
      bookingCount:      bookingCounts[customer.id] ?? 0,
      totalBookingValue: bookingValues[customer.id] ?? 0,
      lastActivityAt,
    });
  }
  return segments;
}
