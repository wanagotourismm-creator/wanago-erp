import type { FirestoreRecord } from "@/types/global";

export type Package = FirestoreRecord & {
  title:         string;
  destination:   string;
  category:      string;           // free text, e.g. Honeymoon/Family/Adventure/Pilgrimage
  durationDays:  number;
  durationNights: number;
  basePrice:     number;
  costPrice:     number;   // what the package costs the company — feeds the profit/incentive calculation on a booking
  inclusions:    string;
  exclusions:    string;
  validFrom:     string | null;
  validTo:       string | null;
  officeId:      string;
  officeName:    string;
  notes:         string | null;
  refNumber:     string;
  packageStatus: "active" | "inactive";
  // Set when an Itinerary links to this package (from the Itinerary side —
  // see itineraries/types Itinerary.packageId). Kept in sync by
  // lib/package-itinerary-sync.ts whenever either side is saved; not
  // user-editable directly, so it's excluded from PackageFormData.
  itineraryId:   string | null;
};

export type PackageFormData = Omit<Package, "id" | "createdAt" | "updatedAt" | "status" | "refNumber" | "itineraryId">;
