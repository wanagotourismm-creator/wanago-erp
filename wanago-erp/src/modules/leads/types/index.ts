import type { FirestoreRecord } from "@/types/global";

export type Lead = FirestoreRecord & {
  // Identity
  name:           string;
  email:          string | null;
  phone:          string;
  alternatePhone: string | null;

  // Trip details
  destination:    string;
  tripType:       string;
  travelDate:     string | null;
  returnDate:     string | null;
  duration:       number | null;
  pax:            number;
  budget:         number | null;

  // Pipeline
  stage:          string;
  priority:       string;
  source:         string;
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
