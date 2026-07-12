import type { FieldValue } from "firebase/firestore";
import type { FirestoreRecord, Timestamp } from "@/types/global";

export type Lead = FirestoreRecord & {
  // Identity
  name:           string;
  email:          string | null;
  phone:          string;
  alternatePhone: string | null;

  // Trip details — filled in progressively; only destination is required
  // up front, the rest comes in after the sales agent's pitch call.
  destination:    string;
  tripType:       string | null;
  travelDate:     string | null;
  returnDate:     string | null;
  duration:       number | null;
  pax:            number | null;
  budget:         number | null;

  // Pipeline
  stage:          string;
  priority:       string;
  source:         string | null;
  assignedTo:     string | null;
  agentName:      string | null;

  // Stamped whenever assignedTo is set/changed — the clock the Fast
  // Closure Bonus measures from (see incentives module). Optional so
  // existing callers (bulk import, older records) don't need updating.
  assignedAt?:    Timestamp | FieldValue | null;

  // Sourced directly by the agent rather than assigned by admin/marketing
  // — feeds the Self-Generated Lead Bonus. Optional, defaults to false.
  isSelfGenerated?: boolean;

  // Set at creation time (and backfilled at "won" conversion) if this
  // lead's phone number matches an existing Customer — surfaces "this
  // person has enquired/booked with us before" immediately, rather than
  // only silently reusing the Customer record once the lead is won.
  // Optional so existing pre-feature leads just show as not-yet-checked.
  matchedCustomerId?: string | null;

  // Referral program — set if this lead entered a valid referral code
  // (resolved to the referring Customer's id at submit time), carried
  // forward onto the new Customer record if/when this lead converts.
  referredByCustomerId?: string | null;

  // Set instead of referredByCustomerId when the referrer was a Freelance
  // Referral Executive rather than a past customer — exactly one of the
  // two is ever set. Also set automatically (never both manually) when
  // this lead came in through the public /r/{code} tracking link instead
  // of a staff member typing a code into the Lead/Customer form.
  referredByPartnerId?: string | null;

  // Customer self-booking link — a long random token (not a real secret,
  // just unguessable) that resolves to this lead at /book/{token} with no
  // login. Generated on demand from the Lead detail page; null until then.
  bookingLinkToken?: string | null;

  // What the customer picked when they used that link — staff still
  // reviews and creates the actual quotation/booking manually, this is
  // just their stated preference showing up on the Lead.
  customerSelectedPackageId?:   string | null;
  customerSelectedPackageName?: string | null;
  customerRequestedTravelDate?: string | null;
  customerRequestedPax?:        number | null;
  customerRequestNotes?:        string | null;
  customerRequestedAt?:         Timestamp | Date | string | null;

  // Office
  officeId:       string;
  officeName:     string;

  // Notes
  notes:          string | null;
  lastContactedAt: unknown | null;

  // Reference
  refNumber:      string;
};

export type LeadFormData = Omit<
  Lead,
  "id" | "createdAt" | "updatedAt" | "refNumber" | "status"
>;
