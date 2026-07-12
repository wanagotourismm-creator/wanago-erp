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
  packageName:      string | null;   // free-text reference to a package for now (no live cross-module link — keep it simple)
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
