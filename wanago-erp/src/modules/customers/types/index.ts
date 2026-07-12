import type { FirestoreRecord } from "@/types/global";

export type Customer = FirestoreRecord & {
  fullName:       string;
  email:          string | null;
  phone:          string;
  alternatePhone: string | null;

  customerType:   string;
  city:           string | null;
  address:        string | null;

  source:         string;
  officeId:       string;
  officeName:     string;

  // The Sales Executive (Employee.id) this customer belongs to, so a
  // `sales` user only ever sees their own — paired with the denormalized
  // name the same way assignedTo/agentName already work on Leads/Bookings.
  // Optional so existing callers (lead-to-customer conversion, bulk
  // import) don't need updating; both null/absent means unassigned.
  assignedTo?:    string | null;
  agentName?:     string | null;

  // Set when this customer was converted from a Lead, so a later Booking
  // can carry the linkage forward (see Booking.leadId) — needed for the
  // incentives engine's Fast Closure Bonus / Self-Generated Lead Bonus.
  convertedFromLeadId?: string | null;

  // Referral program (Marketing) — every customer gets a shareable code the
  // moment they're created; referredByCustomerId is set if *they* came in
  // via someone else's code (captured on the Lead/Customer form). Optional
  // so pre-feature records just show as having no code/referrer yet.
  referralCode?:        string | null;
  referredByCustomerId?: string | null;

  notes:          string | null;
  refNumber:      string;
};

export type CustomerFormData = Omit<
  Customer,
  "id" | "createdAt" | "updatedAt" | "refNumber" | "status"
>;
