import type { FirestoreRecord } from "@/types/global";

export type Customer = FirestoreRecord & {
  // Identity
  name:           string;
  email:          string | null;
  phone:          string;
  alternatePhone: string | null;
  dateOfBirth:    string | null;
  anniversary:    string | null;
  gender:         "male" | "female" | "other" | null;

  // Address
  city:           string | null;
  state:          string | null;
  country:        string;
  pincode:        string | null;

  // Business
  officeId:       string;
  officeName:     string;
  assignedTo:     string | null;
  agentName:      string | null;
  source:         string | null;
  tags:           string[];

  // Stats (computed/cached)
  totalBookings:  number;
  totalRevenue:   number;
  lastBookingDate:unknown | null;

  // Notes
  notes:          string | null;
  refNumber:      string;
};

export type CustomerFormData = Omit<
  Customer,
  "id" | "createdAt" | "updatedAt" | "refNumber" | "status" | "totalBookings" | "totalRevenue" | "lastBookingDate"
>;
