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

  notes:          string | null;
  refNumber:      string;
};

export type CustomerFormData = Omit<
  Customer,
  "id" | "createdAt" | "updatedAt" | "refNumber" | "status"
>;
