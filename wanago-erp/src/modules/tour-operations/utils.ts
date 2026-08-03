import { OPERATIONS_STAGE } from "@/lib/constants";
import { toDate } from "@/lib/utils/helpers";
import type { OperationsBooking } from "@/modules/tour-operations/types";

// Shared thresholds — both the Operations dashboard stat card
// (useTourOperationsStats.ts) and the daily-reminders cron
// (src/app/api/cron/daily-reminders/route.ts) import these so the tile
// count and the reminder it links to never disagree on what's "due soon"
// or "stuck".
export const CLOSURE_STUCK_DAYS = 3;
export const PRE_DEPARTURE_DUE_WITHIN_DAYS = 7;

// Shared "at a glance" derivations — used by the list table, the
// Operations dashboard stat card, and the cron reminders, so a record's
// status is readable without opening it and clicking through its 5 tabs.

export function totalBalanceDue(r: OperationsBooking): number {
  return (
    r.hotelBooking.payment.balancePayment +
    r.meals.payment.balancePayment +
    r.transportArrival.paymentByMode.flight.balancePayment +
    r.transportArrival.paymentByMode.train.balancePayment +
    r.transportArrival.paymentByMode.bus.balancePayment +
    r.transportArrival.paymentByMode.other.balancePayment +
    r.transportSightseeing.payment.balancePayment +
    r.entryTicketsBooking.payment.balancePayment
  );
}

export function openIssueCount(r: OperationsBooking): number {
  return r.onTour.issues.filter((i) => i.status === "pending").length;
}

export function preDepartureProgress(r: OperationsBooking): { done: number; total: number } {
  const items = [
    r.preDeparture.reconfirmBookings.status === "completed",
    r.preDeparture.whatsappGroup.status === "completed",
    // Guide briefing only counts if a guide is actually included — an
    // untouched "pending" for a trip with no guide shouldn't read as
    // incomplete (matches computeStage's same guide.included guard).
    !r.guide.included || r.preDeparture.guideBriefing.status === "completed",
    r.preDeparture.welcomeBoard.status === "completed",
  ];
  return { done: items.filter(Boolean).length, total: items.length };
}

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const startOfToday = new Date(new Date().toDateString());
  return Math.round((target.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
}

// A record whose travel date has passed but whose stage never advanced
// past "pre-departure completed" — the trip should be underway (or over)
// per its own travel date, but nothing in the record reflects that.
export function isStuckPastTravelDate(r: OperationsBooking): boolean {
  const days = daysUntil(r.handover.travelDate);
  if (days === null || days >= 0) return false;
  return (
    r.status === OPERATIONS_STAGE.BOOKING_RECEIVED ||
    r.status === OPERATIONS_STAGE.BOOKING_VERIFICATION_COMPLETED ||
    r.status === OPERATIONS_STAGE.BOOKINGS_COMPLETED ||
    r.status === OPERATIONS_STAGE.PRE_DEPARTURE_COMPLETED
  );
}

// Closure reached (customer home) but the record hasn't fully closed —
// feedback/testimonial/vendor-clearance/etc still pending days later.
export function isClosureStuck(r: OperationsBooking, staleDays: number): boolean {
  if (r.status !== OPERATIONS_STAGE.TOUR_COMPLETED) return false;
  const updated = toDate(r.updatedAt);
  if (!updated) return false;
  const daysSinceUpdate = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceUpdate >= staleDays;
}

export function isPreDepartureDueSoon(r: OperationsBooking, withinDays: number): boolean {
  const days = daysUntil(r.handover.travelDate);
  if (days === null || days < 0 || days > withinDays) return false;
  return preDepartureProgress(r).done < preDepartureProgress(r).total;
}
