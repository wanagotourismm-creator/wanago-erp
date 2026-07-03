import type { FirestoreRecord } from "@/types/global";

export type Booking = FirestoreRecord & {
  refNumber:       string;
  leadId:          string | null;
  customerId:      string | null;
  customerName:    string;
  customerPhone:   string;
  customerEmail:   string | null;
  pax:             number;
  destination:     string;
  tripType:        string;
  departureDate:   string;
  returnDate:      string;
  duration:        number;
  itinerary:       string | null;
  totalAmount:     number;
  paidAmount:      number;
  balanceDue:      number;
  paymentStatus:   "paid" | "partial" | "unpaid" | "overdue";
  bookingStatus:   string;
  officeId:        string;
  officeName:      string;
  assignedTo:      string | null;
  agentName:       string | null;
  supplierId:      string | null;
  supplierName:    string | null;
  notes:           string | null;
  specialRequests: string | null;
  confirmedAt:     unknown | null;
  cancelledAt:     unknown | null;
};

export type BookingFormData = Omit<
  Booking,
  "id" | "createdAt" | "updatedAt" | "refNumber" | "status" | "confirmedAt" | "cancelledAt"
>;
