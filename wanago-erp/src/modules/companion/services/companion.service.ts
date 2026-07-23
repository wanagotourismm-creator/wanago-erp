export type BookingForSelection = {
  id: string;
  status: string;
  travelDate: string | null; // YYYY-MM-DD
  returnDate: string | null;
};

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Pure — picks which of a customer's bookings the Companion portal should
// show. A currently-active trip (today falls within travelDate..returnDate)
// always wins over a merely upcoming one, since that's when the itinerary/
// SOS actually matter most; otherwise the nearest upcoming trip; otherwise
// null (nothing relevant to show). Only confirmed/completed bookings with
// a travelDate count — draft/pending-approval bookings have no confirmed
// trip yet, and a booking with no travelDate at all can't be scheduled.
export function selectRelevantBooking(
  bookings: BookingForSelection[], today: Date = new Date()
): BookingForSelection | null {
  const todayIso = toIsoDate(today);

  const eligible = bookings.filter(
    (b) => (b.status === "confirmed" || b.status === "completed") && !!b.travelDate
  );

  const active = eligible
    .filter((b) => b.travelDate! <= todayIso && (!b.returnDate || todayIso <= b.returnDate))
    .sort((a, b) => a.travelDate!.localeCompare(b.travelDate!));
  if (active.length > 0) return active[0];

  const upcoming = eligible
    .filter((b) => b.travelDate! > todayIso)
    .sort((a, b) => a.travelDate!.localeCompare(b.travelDate!));
  return upcoming[0] ?? null;
}
