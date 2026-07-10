import { where, serverTimestamp, type QueryConstraint } from "firebase/firestore";
import { doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { bookingRepository } from "@/modules/bookings/services/booking.repository";
import { FIRESTORE_COLLECTIONS, BOOKING_STATUS } from "@/lib/constants";
import { toDate } from "@/lib/utils/helpers";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import type { Booking, BookingFormData } from "@/modules/bookings/types";
import { notifyUser } from "@/lib/notify";
import { fetchUsersByPermission, fetchUserById } from "@/lib/notify-recipients";

// Approve/reject used to be a plain read-then-write with no check that the
// booking was still in the expected status — two approvers acting on the
// same booking near-simultaneously (or a stale approvals-queue tab) could
// both write, e.g. a Finance approve racing a Finance reject and leaving a
// rejected booking still stamped with financeApprovedBy. A transaction
// re-reads the current status inside the commit and throws instead of
// applying the transition if it's already moved on.
async function transitionBookingStatus(
  id: string,
  expectedStatus: string,
  patch: Partial<Booking>
): Promise<Booking> {
  const ref = doc(db, FIRESTORE_COLLECTIONS.BOOKINGS, id);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Booking not found.");
    const booking = { id: snap.id, ...snap.data() } as Booking;
    if (booking.status !== expectedStatus) {
      throw new Error(
        `This booking is no longer ${expectedStatus} (it's now ${booking.status}) — someone else may have already actioned it. Refresh and try again.`
      );
    }
    tx.update(ref, { ...patch, updatedAt: serverTimestamp() });
    return booking;
  });
}

// Notification helpers below are best-effort — a failure here must never
// break the actual booking creation/approval/rejection flow, so every
// call site wraps them in try/catch even though notifyUser itself is
// documented to never throw (fetchUsersByPermission/fetchUserById can).

async function notifyApprovers(permission: "bookings:finance_approve" | "bookings:ops_approve", booking: Booking, stage: "Finance" | "Operations") {
  try {
    const approvers = await fetchUsersByPermission(permission);
    await Promise.all(
      approvers.map((u) =>
        notifyUser({
          userId: u.id,
          email: u.email,
          title: `Booking ${booking.refNumber} needs ${stage} approval`,
          body: `${booking.customerName} — ${booking.destination} (${booking.totalAmount}) — submitted by ${booking.agentName ?? "a sales agent"}.`,
          link: "/approvals",
          category: "approval",
        })
      )
    );
  } catch {
    // Notification failures must not block the booking flow.
  }
}

async function notifyCreator(createdBy: string, title: string, body: string) {
  try {
    const creator = await fetchUserById(createdBy);
    if (!creator) return;
    await notifyUser({
      userId: creator.id,
      email: creator.email,
      title,
      body,
      link: "/bookings",
      category: "approval",
    });
  } catch {
    // Notification failures must not block the booking flow.
  }
}

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
  const refNumber = await nextRefNumber("BOOKING");

  const booking = await bookingRepository.create({
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

  await notifyApprovers("bookings:finance_approve", booking, "Finance");

  return booking;
}

export async function updateBooking(
  id: string,
  data: Partial<BookingFormData>
): Promise<void> {
  const patch: Partial<Booking> = { ...data };
  const existing = await bookingRepository.findById(id);
  if (existing) {
    if (data.totalAmount !== undefined || data.advanceAmount !== undefined) {
      const totalAmount   = data.totalAmount   ?? existing.totalAmount;
      const advanceAmount = data.advanceAmount ?? existing.advanceAmount;
      patch.balanceAmount = totalAmount - advanceAmount;
    }

    // Editing a rejected booking is the entire "resubmit" mechanism — it
    // automatically puts the booking back in the right pending queue and
    // clears the previous rejection trail.
    let resubmittedTo: "Finance" | "Operations" | null = null;
    if (existing.status === BOOKING_STATUS.FINANCE_REJECTED) {
      patch.status                 = BOOKING_STATUS.PENDING_FINANCE;
      patch.financeRejectedBy      = null;
      patch.financeRejectedAt      = null;
      patch.financeRejectionReason = null;
      resubmittedTo = "Finance";
    } else if (existing.status === BOOKING_STATUS.OPS_REJECTED) {
      patch.status              = BOOKING_STATUS.OPS_PENDING;
      patch.opsRejectedBy       = null;
      patch.opsRejectedAt       = null;
      patch.opsRejectionReason  = null;
      resubmittedTo = "Operations";
    }

    if (resubmittedTo) {
      await bookingRepository.update(id, patch);
      const resubmitted = { ...existing, ...patch } as Booking;
      await notifyApprovers(
        resubmittedTo === "Finance" ? "bookings:finance_approve" : "bookings:ops_approve",
        resubmitted,
        resubmittedTo
      );
      return;
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
  const existing = await transitionBookingStatus(id, BOOKING_STATUS.PENDING_FINANCE, {
    status:              BOOKING_STATUS.OPS_PENDING,
    financeApprovedBy:   approvedBy,
    financeApprovedAt:   serverTimestamp(),
    paymentVerification,
  } as Partial<Booking>);

  await notifyApprovers("bookings:ops_approve", { ...existing, status: BOOKING_STATUS.OPS_PENDING } as Booking, "Operations");
  await notifyCreator(
    existing.createdBy,
    `Booking ${existing.refNumber} approved by Finance`,
    `${existing.customerName}'s booking has been approved by Finance and is now with Operations for final approval.`
  );
}

// Operations cross-verifies and records the deal's real profit — this is
// what confirms the booking and is what the incentive calculation reads.
export async function approveBookingAsOperations(
  id: string,
  approvedBy: string,
  profitAmount: number
): Promise<void> {
  const existing = await transitionBookingStatus(id, BOOKING_STATUS.OPS_PENDING, {
    status:        BOOKING_STATUS.CONFIRMED,
    opsApprovedBy: approvedBy,
    opsApprovedAt: serverTimestamp(),
    profitAmount,
  } as Partial<Booking>);

  await notifyCreator(
    existing.createdBy,
    `Booking ${existing.refNumber} confirmed`,
    `${existing.customerName}'s booking has been approved by Operations and is now fully confirmed.`
  );
}

// Finance rejects the booking with a reason instead of approving — editing
// the booking later (see updateBooking) automatically resubmits it.
export async function rejectBookingAsFinance(
  id: string,
  rejectedBy: string,
  reason: string
): Promise<void> {
  const existing = await transitionBookingStatus(id, BOOKING_STATUS.PENDING_FINANCE, {
    status:                 BOOKING_STATUS.FINANCE_REJECTED,
    financeRejectedBy:      rejectedBy,
    financeRejectedAt:      serverTimestamp(),
    financeRejectionReason: reason,
  } as Partial<Booking>);

  await notifyCreator(
    existing.createdBy,
    `Booking ${existing.refNumber} rejected by Finance`,
    `${existing.customerName}'s booking was rejected by Finance. Reason: ${reason}`
  );
}

// Operations rejects the booking with a reason instead of approving —
// editing the booking later (see updateBooking) automatically resubmits it.
export async function rejectBookingAsOperations(
  id: string,
  rejectedBy: string,
  reason: string
): Promise<void> {
  const existing = await transitionBookingStatus(id, BOOKING_STATUS.OPS_PENDING, {
    status:              BOOKING_STATUS.OPS_REJECTED,
    opsRejectedBy:       rejectedBy,
    opsRejectedAt:       serverTimestamp(),
    opsRejectionReason:  reason,
  } as Partial<Booking>);

  await notifyCreator(
    existing.createdBy,
    `Booking ${existing.refNumber} rejected by Operations`,
    `${existing.customerName}'s booking was rejected by Operations. Reason: ${reason}`
  );
}

export async function deleteBooking(id: string): Promise<void> {
  return bookingRepository.delete(id);
}
