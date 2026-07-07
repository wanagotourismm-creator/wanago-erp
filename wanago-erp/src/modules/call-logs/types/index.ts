import type { FirestoreRecord } from "@/types/global";

export type CallMethod    = "phone" | "whatsapp";
export type CallDirection = "outbound" | "inbound";
export type CallOutcome   = "connected" | "no_answer" | "busy" | "wrong_number";

// Free-tier call log — everything here is manual entry, since there's no
// telephony provider (Exotel/Knowlarity) connected yet. Linked to a Lead
// or Customer the same way Booking links to Customer (denormalized id +
// display fields, no back-reference on the Lead/Customer document itself).
export type CallLog = FirestoreRecord & {
  leadId:      string | null;
  customerId:  string | null;
  contactName: string;
  phone:       string;

  callMethod: CallMethod;
  direction:  CallDirection;
  outcome:    CallOutcome;
  durationMinutes: number | null;
  notes:      string | null;

  // Auto-stamped from the logged-in user's Employee record — not
  // form-editable.
  loggedBy:     string;
  loggedByName: string;

  followUpNeeded: boolean;
  followUpDate:   string | null;

  // Manually attached by staff (e.g. recorded on their own phone), same
  // Firebase Storage upload pattern as Expense receipts.
  recordingFileUrl: string | null;

  // TODO: auto-populate via telephony webhook once a provider
  // (Exotel/Knowlarity) is connected — see recordingFileUrl for the
  // manual-upload alternative used until then.
  recordingUrl: string | null;

  refNumber: string;
};

export type CallLogFormData = Omit<
  CallLog,
  | "id" | "createdAt" | "updatedAt" | "createdBy" | "status" | "refNumber"
  | "recordingFileUrl" | "recordingUrl" | "loggedBy" | "loggedByName"
>;
