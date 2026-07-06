import type { FirestoreRecord } from "@/types/global";

export type Supplier = FirestoreRecord & {
  name:           string;
  category:       string;         // free text, e.g. Hotel/Transport/Activity/Guide/Other
  contactPerson:  string;
  phone:          string;
  email:          string | null;
  address:        string | null;
  city:           string | null;
  gstNumber:      string | null;
  paymentTerms:   string | null;
  officeId:       string;
  officeName:     string;
  notes:          string | null;
  refNumber:      string;
  supplierStatus: "active" | "inactive";
};

export type SupplierFormData = Omit<Supplier, "id" | "createdAt" | "updatedAt" | "status" | "refNumber">;
