import type { FirestoreRecord } from "@/types/global";

export type ItineraryDay = {
  dayNumber:   number;
  title:       string;
  description: string;
};

export type Itinerary = FirestoreRecord & {
  title:            string;
  destination:      string;
  durationDays:     number;
  tripType:         string | null;   // matches TRIP_TYPES — optional, only used to steer AI drafting today
  // Live link to a Package (chosen or auto-created via the PackageSelect in
  // ItineraryForm) — packageName is a denormalized copy of that Package's
  // title, kept in sync by lib/package-itinerary-sync.ts on every save on
  // either side, not hand-typed.
  packageId:        string | null;
  packageName:      string | null;
  days:             ItineraryDay[];
  // Populated either by hand or via the "Draft with AI" button
  // (itinerary-ai.service.ts) — plain editable fields either way, an AI
  // draft is just a starting point a human reviews before saving.
  tagline:          string | null;
  inclusions:       string[];
  exclusions:       string[];
  officeId:         string;
  officeName:       string;
  notes:            string | null;
  refNumber:        string;
  itineraryStatus:  "draft" | "confirmed";
};

export type ItineraryFormData = Omit<Itinerary, "id" | "createdAt" | "updatedAt" | "status" | "refNumber">;

// Sentinel value for the PackageSelect's "+ Create new package" option —
// itinerary.service.createItinerary/updateItinerary swap it out for a real
// package id after creating the package.
export const CREATE_NEW_PACKAGE = "__create_new_package__";
