import type { FirestoreRecord } from "@/types/global";

export type QuotationStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired"
  | "converted";

export type QuotationLineItem = {
  description: string;
  amount:      number;
};

export type Quotation = Omit<FirestoreRecord, "status"> & {
  customerId:    string;
  customerName:  string;
  customerPhone: string;

  destination:   string;
  packageId:     string | null;
  packageName:   string | null;

  // Tracked here (rather than left to default) so "Convert to Booking"
  // can map straight onto Booking.pax without guessing.
  pax:           number;

  lineItems:     QuotationLineItem[];
  subtotal:      number;
  taxRate:       number | null;
  taxAmount:     number | null;
  totalAmount:   number;

  validUntil:    string | null;

  status:        QuotationStatus;

  officeId:      string;
  officeName:    string;

  notes:         string | null;
  refNumber:     string;

  // Set once "Convert to Booking" has been used — lets the UI link back
  // to the resulting booking and prevents re-converting.
  convertedBookingId: string | null;
};

// subtotal/taxAmount/totalAmount are derived server-side (in the service)
// from lineItems + taxRate, so they're excluded here rather than trusted
// from the form.
export type QuotationFormData = Omit<
  Quotation,
  | "id" | "createdAt" | "updatedAt" | "refNumber" | "status"
  | "subtotal" | "taxAmount" | "totalAmount" | "convertedBookingId"
>;
