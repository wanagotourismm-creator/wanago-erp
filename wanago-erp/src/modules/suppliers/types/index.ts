import type { FirestoreRecord } from "@/types/global";

export type SupplierCategory =
  | "hotel"
  | "airline"
  | "transport"
  | "cruise"
  | "visa"
  | "insurance"
  | "activity"
  | "restaurant"
  | "other";

export type Supplier = FirestoreRecord & {
  refNumber:    string;
  name:         string;
  category:     SupplierCategory;
  contactName:  string | null;
  phone:        string;
  email:        string | null;
  website:      string | null;
  country:      string;
  city:         string | null;
  address:      string | null;
  gstNumber:    string | null;
  panNumber:    string | null;
  bankName:     string | null;
  accountNumber:string | null;
  ifscCode:     string | null;
  rating:       number;
  tags:         string[];
  notes:        string | null;
  officeId:     string;
  officeName:   string;
};

export type SupplierFormData = Omit<
  Supplier,
  "id" | "createdAt" | "updatedAt" | "refNumber" | "status"
>;
