import type { FirestoreRecord } from "@/types/global";

export type CallMethod    = "phone" | "whatsapp";
export type CallDirection = "outbound" | "inbound";
// "in_progress" is bridge-call-only (see telephony.service.ts) — set the
// instant a click-to-call is placed, before anyone's answered, then patched
// to a real outcome once the Exotel webhook reports how the call ended.
// Manually-logged calls (CallLogForm.tsx) never use this value — the agent
// always already knows the real outcome by the time they fill the form in.
export type CallOutcome   = "connected" | "no_answer" | "busy" | "wrong_number" | "in_progress";

// Free-tier call log by default — everything here is manual entry, unless
// Admin → Integrations' Voice Calling (Exotel) is configured and enabled,
// in which case click-to-call bridge calls create/patch these
// automatically (externalCallSid/recordingUrl below). Linked to a Lead
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

  // Auto-populated via the Exotel StatusCallback webhook once a bridge call
  // ends (see /api/telephony/exotel/callback) — null for manually-logged
  // calls, which still use recordingFileUrl (manual upload) instead.
  recordingUrl: string | null;

  // Exotel's CallSid — the only way the inbound webhook can find its way
  // back to the right doc (queried by this field). Null for every
  // manually-logged call; only ever set by /api/telephony/exotel/call.
  externalCallSid: string | null;

  refNumber: string;
};

export type CallLogFormData = Omit<
  CallLog,
  | "id" | "createdAt" | "updatedAt" | "createdBy" | "status" | "refNumber"
  | "recordingFileUrl" | "recordingUrl" | "loggedBy" | "loggedByName" | "externalCallSid"
>;
