import type { FirestoreRecord } from "@/types/global";

export type IntakeStatus = "new" | "contacted" | "converted";

// Written server-side by /api/portal/customer/booking-requests — a
// customer stating "I want this package," never a real Booking (no
// officeId/assignedTo/approval trail, none of which a customer should set
// themselves). Staff reviews here and creates the actual Booking manually.
export type BookingRequest = FirestoreRecord & {
  customerId:   string;
  customerName: string;
  packageId:    string;
  packageName:  string;
  travelDate:   string | null;
  pax:          number | null;
  notes:        string | null;
  requestStatus: IntakeStatus;
};

// Written server-side by /api/public/quick-inquiry — the lowest-friction
// capture in the app (phone + area only, no login, often no name). Staff
// converts the ones worth pursuing into a real Lead.
export type QuickInquiry = FirestoreRecord & {
  name:    string | null;
  phone:   string;
  address: string;
  inquiryStatus: IntakeStatus;
};
