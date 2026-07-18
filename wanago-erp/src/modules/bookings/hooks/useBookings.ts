"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchBookings, fetchBookingById, createBooking, updateBooking,
  updateBookingStatus, deleteBooking,
  approveBookingAsFinance, approveBookingAsOperations,
  rejectBookingAsFinance, rejectBookingAsOperations,
} from "@/modules/bookings/services/booking.service";
import { useAuthStore } from "@/store/auth.store";
import { useCurrentEmployee } from "@/modules/dashboard/hooks/useCurrentEmployee";
import { scopeByAssignee } from "@/lib/rbac-scope";
import { logActivity } from "@/lib/activity-log";
import { BOOKING_STATUS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils/helpers";
import type { Booking, BookingFormData } from "@/modules/bookings/types";

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const { user } = useAuthStore();
  const { employee } = useCurrentEmployee();

  // A role without bookings:view_all only sees bookings assigned to them
  // (or unassigned); roles with it (including Finance, for approvals) see
  // the full list.
  const scopedBookings = useMemo(
    () => scopeByAssignee(bookings, user?.systemRole ?? "sales", employee?.id ?? null, "bookings:view_all"),
    [bookings, user?.systemRole, employee?.id]
  );

  const load = useCallback(async (filters?: { status?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBookings(filters);
      setBookings(data);
    } catch {
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addBooking(data: BookingFormData): Promise<{ error: string | null }> {
    try {
      const booking = await createBooking(data, user?.uid ?? "");
      setBookings(prev => [booking, ...prev]);
      logActivity({
        entityType: "Booking", entityName: booking.customerName, action: "created",
        detail: `Created booking ${booking.refNumber} (${booking.destination})`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to create booking" };
    }
  }

  async function editBooking(
    id: string, data: Partial<BookingFormData>
  ): Promise<{ error: string | null }> {
    try {
      await updateBooking(id, data);
      // A server refetch (rather than an optimistic shallow merge) is
      // needed because updateBooking may also silently resubmit a rejected
      // booking server-side (status reset + cleared rejection fields),
      // which wouldn't be reflected in the caller's partial `data` — but
      // that only requires fresh truth for THIS booking, not the whole
      // collection, so fetch just the one document instead.
      const updated = await fetchBookingById(id);
      if (updated) setBookings(prev => prev.map(b => b.id === id ? updated : b));
      return { error: null };
    } catch {
      return { error: "Failed to update booking" };
    }
  }

  async function changeStatus(id: string, status: string): Promise<void> {
    await updateBookingStatus(id, status);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } as Booking : b));
    const booking = bookings.find(b => b.id === id);
    if (booking) {
      logActivity({
        entityType: "Booking", entityName: booking.customerName, action: "status_changed",
        detail: `${booking.refNumber} moved to ${status}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
    }
  }

  async function approveFinance(
    id: string, paymentVerification: "full" | "partial"
  ): Promise<{ error: string | null }> {
    try {
      const approvedBy = user?.uid ?? "";
      await approveBookingAsFinance(id, approvedBy, paymentVerification);
      setBookings(prev => prev.map(b => b.id === id ? {
        ...b,
        status:              BOOKING_STATUS.OPS_PENDING,
        financeApprovedBy:   approvedBy,
        financeApprovedAt:   new Date(),
        paymentVerification,
      } as Booking : b));
      const booking = bookings.find(b => b.id === id);
      if (booking) {
        logActivity({
          entityType: "Booking", entityName: booking.customerName, action: "status_changed",
          detail: `${booking.refNumber} approved by Finance (${paymentVerification} payment received)`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to approve booking" };
    }
  }

  async function approveOperations(
    id: string, profitAmount: number
  ): Promise<{ error: string | null }> {
    try {
      const approvedBy = user?.uid ?? "";
      await approveBookingAsOperations(id, approvedBy, profitAmount);
      setBookings(prev => prev.map(b => b.id === id ? {
        ...b,
        status:        BOOKING_STATUS.CONFIRMED,
        opsApprovedBy: approvedBy,
        opsApprovedAt: new Date(),
        profitAmount,
      } as Booking : b));
      const booking = bookings.find(b => b.id === id);
      if (booking) {
        logActivity({
          entityType: "Booking", entityName: booking.customerName, action: "status_changed",
          detail: `${booking.refNumber} approved by Operations (profit ${formatCurrency(profitAmount)})`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to approve booking" };
    }
  }

  async function rejectFinance(
    id: string, rejectedBy: string, reason: string
  ): Promise<{ error: string | null }> {
    try {
      await rejectBookingAsFinance(id, rejectedBy, reason);
      setBookings(prev => prev.map(b => b.id === id ? {
        ...b,
        status:                 BOOKING_STATUS.FINANCE_REJECTED,
        financeRejectedBy:      rejectedBy,
        financeRejectedAt:      new Date(),
        financeRejectionReason: reason,
      } as Booking : b));
      const booking = bookings.find(b => b.id === id);
      if (booking) {
        logActivity({
          entityType: "Booking", entityName: booking.customerName, action: "status_changed",
          detail: `${booking.refNumber} rejected by Finance (${reason})`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to reject booking" };
    }
  }

  async function rejectOperations(
    id: string, rejectedBy: string, reason: string
  ): Promise<{ error: string | null }> {
    try {
      await rejectBookingAsOperations(id, rejectedBy, reason);
      setBookings(prev => prev.map(b => b.id === id ? {
        ...b,
        status:              BOOKING_STATUS.OPS_REJECTED,
        opsRejectedBy:       rejectedBy,
        opsRejectedAt:       new Date(),
        opsRejectionReason:  reason,
      } as Booking : b));
      const booking = bookings.find(b => b.id === id);
      if (booking) {
        logActivity({
          entityType: "Booking", entityName: booking.customerName, action: "status_changed",
          detail: `${booking.refNumber} rejected by Operations (${reason})`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to reject booking" };
    }
  }

  async function removeBooking(id: string): Promise<{ error: string | null }> {
    try {
      const booking = bookings.find(b => b.id === id);
      await deleteBooking(id);
      setBookings(prev => prev.filter(b => b.id !== id));
      if (booking) {
        logActivity({
          entityType: "Booking", entityName: booking.customerName, action: "deleted",
          detail: `Deleted booking ${booking.refNumber}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete booking" };
    }
  }

  return {
    bookings: scopedBookings, loading, error, load, addBooking, editBooking, changeStatus,
    approveFinance, approveOperations, rejectFinance, rejectOperations, removeBooking,
  };
}
