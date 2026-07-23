import type { FieldValue } from "firebase/firestore";
import type { FirestoreRecord, Timestamp } from "@/types/global";

export type TripCompanion = FirestoreRecord & {
  bookingId:  string;
  customerId: string;
  liveLocationOptIn: boolean;
  lastLocation:   { lat: number; lng: number } | null;
  lastLocationAt: Timestamp | Date | string | FieldValue | null;
};

// Named sosStatus, not status — FirestoreRecord already has a generic
// `status` field ("active"/"trashed", used by the soft-delete system every
// other collection shares); a domain field with the same name would
// silently collide with that. Same reasoning as Ticket.ticketStatus.
export type SosEventStatus = "active" | "resolved";

export type SosEvent = FirestoreRecord & {
  bookingId:        string;
  bookingRefNumber: string;
  customerId:       string;
  customerName:     string;
  customerPhone:    string;
  lat: number; lng: number;
  // Resolved client-side via the existing reverseGeocode() (src/lib/geo.ts)
  // before POSTing — the server route just stores whatever the browser
  // already resolved, no second geocoding call needed.
  address: string | null;
  sosStatus: SosEventStatus;
  resolvedBy: string | null;
  resolvedAt: Timestamp | Date | string | FieldValue | null;
};

// ── Portal-facing shapes (what /api/portal/customer/companion returns) ──
export type CompanionResourceContact = {
  type: "vehicle" | "driver" | "guide" | "room_block";
  name: string;
  phone: string | null;
};

export type CompanionEmergencyContact = {
  label: string;
  phone: string;
};

export type CompanionBooking = {
  id: string; refNumber: string; destination: string;
  travelDate: string | null; returnDate: string | null;
};

export type CompanionItineraryDay = {
  dayNumber: number; title: string; description: string;
};

export type CompanionData = {
  booking: CompanionBooking | null;
  itinerary: { title: string; days: CompanionItineraryDay[] } | null;
  resources: CompanionResourceContact[];
  emergencyContacts: CompanionEmergencyContact[];
  liveLocationOptIn: boolean;
};
