// Customer segmentation — a single, shared rule so the Customers list,
// detail page, and (later) campaign targeting all agree on what "VIP" or
// "Dormant" means, rather than each screen inventing its own threshold.

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
