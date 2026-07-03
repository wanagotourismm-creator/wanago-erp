"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchBookings, createBooking, updateBooking, updateBookingStatus, deleteBooking } from "@/modules/bookings/services/booking.service";
import { useAuthStore } from "@/store/auth.store";
import type { Booking, BookingFormData } from "@/modules/bookings/types";

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try { setBookings(await fetchBookings()); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addBooking(data: BookingFormData) {
    try {
      const b = await createBooking(data, user?.uid ?? "");
      setBookings(p => [b, ...p]);
      return { error: null };
    } catch { return { error: "Failed to create booking" }; }
  }

  async function editBooking(id: string, data: Partial<BookingFormData>) {
    try {
      await updateBooking(id, data);
      setBookings(p => p.map(b => b.id === id ? { ...b, ...data } : b));
      return { error: null };
    } catch { return { error: "Failed to update booking" }; }
  }

  async function changeStatus(id: string, bookingStatus: string) {
    await updateBookingStatus(id, bookingStatus);
    setBookings(p => p.map(b => b.id === id ? { ...b, bookingStatus } : b));
  }

  async function removeBooking(id: string) {
    try {
      await deleteBooking(id);
      setBookings(p => p.filter(b => b.id !== id));
      return { error: null };
    } catch { return { error: "Failed to delete booking" }; }
  }

  const stats = {
    total:     bookings.length,
    confirmed: bookings.filter(b => b.bookingStatus === "confirmed").length,
    revenue:   bookings.reduce((s, b) => s + (b.totalAmount ?? 0), 0),
    collected: bookings.reduce((s, b) => s + (b.paidAmount ?? 0), 0),
    balance:   bookings.reduce((s, b) => s + (b.balanceDue ?? 0), 0),
  };

  return { bookings, loading, stats, load, addBooking, editBooking, changeStatus, removeBooking };
}
