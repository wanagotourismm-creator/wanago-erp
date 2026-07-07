import type { FieldValue } from "firebase/firestore";
import type { FirestoreRecord, Timestamp } from "@/types/global";
import type { BookingStatus } from "@/lib/constants";

export type Booking = Omit<FirestoreRecord, "status"> & {
  customerId:    string;
  customerName:  string;
  customerPhone: string;

  destination:   string;
  tripType:      string;
  packageId:     string | null;
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

  // Carried over from the customer's convertedFromLeadId (if any) when the
  // booking is created — links back to the originating Lead so the
  // incentives engine can measure Fast Closure / Self-Generated bonuses.
  // Optional; null/absent means this booking has no linked lead.
  leadId?:       string | null;

  officeId:      string;
  officeName:    string;

  notes:         string | null;
  refNumber:     string;

  // Finance → Operations approval trail. Finance verifies how much of the
  // amount has actually come in before the booking moves into Operations'
  // queue; Operations records the deal's real profit (which may differ
  // from the linked package's default cost/profit) when they confirm it.
  financeApprovedBy:   string | null;
  financeApprovedAt:   Timestamp | Date | string | FieldValue | null;
  paymentVerification: "full" | "partial" | null;
  opsApprovedBy:       string | null;
  opsApprovedAt:       Timestamp | Date | string | FieldValue | null;
  profitAmount:        number | null;

  // Set once the international-package 10-day-before-travel follow-up
  // reminder has fired, so it doesn't re-notify on every check.
  followUpNotifiedAt: Timestamp | Date | string | FieldValue | null;
};

export type BookingFormData = Omit<
  Booking,
  | "id" | "createdAt" | "updatedAt" | "refNumber" | "status" | "balanceAmount"
  | "financeApprovedBy" | "financeApprovedAt" | "paymentVerification"
  | "opsApprovedBy" | "opsApprovedAt" | "profitAmount" | "followUpNotifiedAt"
>;
