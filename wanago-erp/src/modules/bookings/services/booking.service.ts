import { where, serverTimestamp, type QueryConstraint } from "firebase/firestore";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { bookingRepository } from "@/modules/bookings/services/booking.repository";
import { FIRESTORE_COLLECTIONS, BOOKING_STATUS } from "@/lib/constants";
import { generateRefNumber, toDate } from "@/lib/utils/helpers";
import type { Booking, BookingFormData } from "@/modules/bookings/types";

// Note: sorted client-side (not via Firestore orderBy) so filtered
// queries only need single-field indexes, which Firestore creates
// automatically — no manual composite index deployment required.
export async function fetchBookings(filters?: {
  status?:     string;
  officeId?:   string;
  customerId?: string;
}): Promise<Booking[]> {
  const constraints: QueryConstraint[] = [];
  if (filters?.status)     constraints.push(where("status",     "==", filters.status));
  if (filters?.officeId)   constraints.push(where("officeId",   "==", filters.officeId));
  if (filters?.customerId) constraints.push(where("customerId", "==", filters.customerId));
  const bookings = await bookingRepository.findMany({ constraints });
  return bookings.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export async function fetchBookingById(id: string): Promise<Booking | null> {
  return bookingRepository.findById(id);
}

export async function createBooking(
  data: BookingFormData,
  createdBy: string
): Promise<Booking> {
  const existing = await getDocs(collection(db, FIRESTORE_COLLECTIONS.BOOKINGS));
  const ids       = existing.docs.map(d => d.data().refNumber ?? "");
  const refNumber = generateRefNumber("BOOKING", ids);

  return bookingRepository.create({
    ...data,
    refNumber,
    createdBy,
    status:        BOOKING_STATUS.PENDING_FINANCE,
    balanceAmount: data.totalAmount - data.advanceAmount,
    packageId:     data.packageId   || null,
    packageName:   data.packageName || null,
    travelDate:    data.travelDate  || null,
    returnDate:    data.returnDate  || null,
    assignedTo:    data.assignedTo  || null,
    agentName:     data.agentName   || null,
    notes:         data.notes       || null,
    leadId:        data.leadId      ?? null,
    financeApprovedBy:   null,
    financeApprovedAt:   null,
    paymentVerification: null,
    opsApprovedBy:       null,
    opsApprovedAt:       null,
    profitAmount:        null,
    followUpNotifiedAt:  null,
  });
}

export async function updateBooking(
  id: string,
  data: Partial<BookingFormData>
): Promise<void> {
  const patch: Partial<Booking> = { ...data };
  if (data.totalAmount !== undefined || data.advanceAmount !== undefined) {
    const existing = await bookingRepository.findById(id);
    if (existing) {
      const totalAmount   = data.totalAmount   ?? existing.totalAmount;
      const advanceAmount = data.advanceAmount ?? existing.advanceAmount;
      patch.balanceAmount = totalAmount - advanceAmount;
    }
  }
  return bookingRepository.update(id, patch);
}

export async function updateBookingStatus(
  id: string,
  status: string
): Promise<void> {
  return bookingRepository.update(id, { status } as Partial<Booking>);
}

// Finance verifies how much of the amount has actually come in, then the
// booking moves into Operations' queue.
export async function approveBookingAsFinance(
  id: string,
  approvedBy: string,
  paymentVerification: "full" | "partial"
): Promise<void> {
  return bookingRepository.update(id, {
    status:              BOOKING_STATUS.OPS_PENDING,
    financeApprovedBy:   approvedBy,
    financeApprovedAt:   serverTimestamp(),
    paymentVerification,
  } as Partial<Booking>);
}

// Operations cross-verifies and records the deal's real profit — this is
// what confirms the booking and is what the incentive calculation reads.
export async function approveBookingAsOperations(
  id: string,
  approvedBy: string,
  profitAmount: number
): Promise<void> {
  return bookingRepository.update(id, {
    status:        BOOKING_STATUS.CONFIRMED,
    opsApprovedBy: approvedBy,
    opsApprovedAt: serverTimestamp(),
    profitAmount,
  } as Partial<Booking>);
}

export async function deleteBooking(id: string): Promise<void> {
  return bookingRepository.delete(id);
}
