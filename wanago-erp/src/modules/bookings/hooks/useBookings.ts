"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchBookings, createBooking, updateBooking,
  updateBookingStatus, deleteBooking,
  approveBookingAsFinance, approveBookingAsOperations,
} from "@/modules/bookings/services/booking.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import { BOOKING_STATUS } from "@/lib/constants";
import type { Booking, BookingFormData } from "@/modules/bookings/types";

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const { user } = useAuthStore();

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
      setBookings(prev => prev.map(b => {
        if (b.id !== id) return b;
        const totalAmount   = data.totalAmount   ?? b.totalAmount;
        const advanceAmount = data.advanceAmount ?? b.advanceAmount;
        return { ...b, ...data, balanceAmount: totalAmount - advanceAmount };
      }));
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
          detail: `${booking.refNumber} approved by Operations (profit ₹${profitAmount})`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to approve booking" };
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
    bookings, loading, error, load, addBooking, editBooking, changeStatus,
    approveFinance, approveOperations, removeBooking,
  };
}
