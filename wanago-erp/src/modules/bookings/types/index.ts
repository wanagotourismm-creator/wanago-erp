import type { FirestoreRecord } from "@/types/global";
import type { BookingStatus } from "@/lib/constants";

export type Booking = Omit<FirestoreRecord, "status"> & {
  customerId:    string;
  customerName:  string;
  customerPhone: string;

  destination:   string;
  tripType:      string;
  packageName:   string | null;
  travelDate:    string | null;
  returnDate:    string | null;
  pax:           number;

  totalAmount:   number;
  advanceAmount: number;
  balanceAmount: number;

  status:        BookingStatus;
  assignedTo:    string | null;
  agentName:     string | null;

  officeId:      string;
  officeName:    string;

  notes:         string | null;
  refNumber:     string;
};

export type BookingFormData = Omit<
  Booking,
  "id" | "createdAt" | "updatedAt" | "refNumber" | "status" | "balanceAmount"
>;
