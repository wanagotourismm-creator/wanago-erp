import type { FirestoreRecord } from "@/types/global";

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
