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
