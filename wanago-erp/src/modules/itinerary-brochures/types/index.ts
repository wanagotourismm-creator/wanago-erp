import type { FirestoreRecord } from "@/types/global";

export type BrochureDay = {
  dayNumber:    number;
  title:        string;
  bulletPoints: string[];
  imageUrl:     string | null;
};

export type ItineraryBrochure = FirestoreRecord & {
  destination:     string;
  route:           string | null;
  tagline:         string | null;

  durationDays:    number;
  durationNights:  number;

  coverImageUrl:   string;

  days:            BrochureDay[];

  inclusions:      string[];
  exclusions:      string[];

  termsAndConditions: string;

  contactPhones:   string[];
  officeAddresses: string[];

  customerName:    string | null;
  packagePrice:    number | null;

  refNumber:       string;
  brochureStatus:  "draft" | "sent" | "archived";

  // Set once a PDF has been generated for this exact set of field values —
  // lets the detail page offer "Download" (reuse the stored file) vs.
  // "Regenerate" (fields changed since the last render).
  pdfUrl:          string | null;
  pdfGeneratedAt:  FirestoreRecord["createdAt"] | null;
};

export type ItineraryBrochureFormData = Omit<
  ItineraryBrochure,
  "id" | "createdAt" | "updatedAt" | "status" | "refNumber" | "pdfUrl" | "pdfGeneratedAt"
>;
