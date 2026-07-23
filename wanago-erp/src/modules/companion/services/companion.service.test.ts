import { describe, it, expect } from "vitest";
import { selectRelevantBooking, type BookingForSelection } from "./companion.service";

function booking(overrides: Partial<BookingForSelection>): BookingForSelection {
  return { id: "b1", status: "confirmed", travelDate: "2026-08-01", returnDate: "2026-08-05", ...overrides };
}

const today = new Date("2026-08-03T00:00:00.000Z");

describe("selectRelevantBooking", () => {
  it("returns null when there are no bookings", () => {
    expect(selectRelevantBooking([], today)).toBeNull();
  });

  it("returns null when no booking is confirmed/completed", () => {
    const bookings = [booking({ id: "b1", status: "pending_approval" }), booking({ id: "b2", status: "draft" })];
    expect(selectRelevantBooking(bookings, today)).toBeNull();
  });

  it("returns null when the only eligible bookings have no travelDate", () => {
    const bookings = [booking({ id: "b1", travelDate: null })];
    expect(selectRelevantBooking(bookings, today)).toBeNull();
  });

  it("prefers a currently-active trip over a later upcoming one", () => {
    const active = booking({ id: "active", travelDate: "2026-08-01", returnDate: "2026-08-05" });
    const upcoming = booking({ id: "upcoming", travelDate: "2026-09-01", returnDate: "2026-09-05" });
    expect(selectRelevantBooking([upcoming, active], today)?.id).toBe("active");
  });

  it("treats an active trip with no returnDate as still active (open-ended)", () => {
    const active = booking({ id: "active", travelDate: "2026-08-01", returnDate: null });
    expect(selectRelevantBooking([active], today)?.id).toBe("active");
  });

  it("ignores a past, non-active trip and falls back to the nearest upcoming one", () => {
    const past = booking({ id: "past", travelDate: "2026-07-01", returnDate: "2026-07-05" });
    const soon = booking({ id: "soon", travelDate: "2026-09-01", returnDate: "2026-09-05" });
    const later = booking({ id: "later", travelDate: "2026-10-01", returnDate: "2026-10-05" });
    expect(selectRelevantBooking([later, past, soon], today)?.id).toBe("soon");
  });

  it("ignores a completed-in-the-past trip whose returnDate is before today", () => {
    const done = booking({ id: "done", status: "completed", travelDate: "2026-01-01", returnDate: "2026-01-05" });
    expect(selectRelevantBooking([done], today)).toBeNull();
  });

  it("picks the earliest-starting active trip when multiple are active", () => {
    const a = booking({ id: "a", travelDate: "2026-08-02", returnDate: "2026-08-06" });
    const b = booking({ id: "b", travelDate: "2026-08-01", returnDate: "2026-08-04" });
    expect(selectRelevantBooking([a, b], today)?.id).toBe("b");
  });
});
