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
  packageName:      string | null;   // free-text reference to a package for now (no live cross-module link — keep it simple)
  days:             ItineraryDay[];
  officeId:         string;
  officeName:       string;
  notes:            string | null;
  refNumber:        string;
  itineraryStatus:  "draft" | "confirmed";
};

export type ItineraryFormData = Omit<Itinerary, "id" | "createdAt" | "updatedAt" | "status" | "refNumber">;
