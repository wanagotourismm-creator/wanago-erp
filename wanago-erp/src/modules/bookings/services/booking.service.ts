import { orderBy } from "firebase/firestore";
import { getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { bookingRepository } from "@/modules/bookings/services/booking.repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { generateRefNumber } from "@/lib/utils/helpers";
import type { Booking, BookingFormData } from "@/modules/bookings/types";

export async function fetchBookings(): Promise<Booking[]> {
  return bookingRepository.findMany({ constraints: [orderBy("createdAt","desc")] });
}

export async function createBooking(data: BookingFormData, createdBy: string): Promise<Booking> {
  const existing  = await getDocs(collection(db, FIRESTORE_COLLECTIONS.BOOKINGS));
  const ids       = existing.docs.map(d => d.data().refNumber ?? "");
  const refNumber = generateRefNumber("BOOKING", ids);
  const balanceDue    = (data.totalAmount ?? 0) - (data.paidAmount ?? 0);
  const paymentStatus = balanceDue <= 0 ? "paid" : (data.paidAmount ?? 0) > 0 ? "partial" : "unpaid";

  return bookingRepository.create({
    ...data, refNumber, createdBy, status: "active",
    balanceDue, paymentStatus,
    confirmedAt: null, cancelledAt: null,
    leadId:          data.leadId          || null,
    customerId:      data.customerId      || null,
    customerEmail:   data.customerEmail   || null,
    assignedTo:      data.assignedTo      || null,
    agentName:       data.agentName       || null,
    supplierId:      data.supplierId      || null,
    supplierName:    data.supplierName    || null,
    itinerary:       data.itinerary       || null,
    notes:           data.notes           || null,
    specialRequests: data.specialRequests || null,
  });
}

export async function updateBooking(id: string, data: Partial<BookingFormData>): Promise<void> {
  const updates: Partial<Booking> = { ...data } as Partial<Booking>;
  if (data.totalAmount !== undefined || data.paidAmount !== undefined) {
    const total = data.totalAmount ?? 0;
    const paid  = data.paidAmount  ?? 0;
    updates.balanceDue    = total - paid;
    updates.paymentStatus = updates.balanceDue <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
  }
  return bookingRepository.update(id, updates);
}

export async function updateBookingStatus(id: string, bookingStatus: string): Promise<void> {
  return bookingRepository.update(id, { bookingStatus } as Partial<Booking>);
}

export async function deleteBooking(id: string): Promise<void> {
  return bookingRepository.delete(id);
}
