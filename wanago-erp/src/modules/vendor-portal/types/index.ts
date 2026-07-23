import type { FirestoreRecord } from "@/types/global";

// serviceName/unit are free text — Supplier.category is free text too and
// no fixed service taxonomy exists anywhere in this app to peg an enum to
// (e.g. "Deluxe Double Room", "AC Sedan (Innova)", "per night", "per trip").
export type VendorRate = FirestoreRecord & {
  supplierId:   string;
  supplierName: string; // denormalized so the cross-supplier staff table needs no N+1 joins
  serviceName:  string;
  description:  string | null;
  unit:         string;
  rateAmount:   number;
  currency:     "INR"; // hardcoded — no multi-currency support exists anywhere in this app
  validFrom:    string | null; // YYYY-MM-DD
  validTo:      string | null;
  notes:        string | null;
  // Provenance only, not a workflow state — true via /vendor/{token},
  // false if staff entered it directly. No pending/approved/rejected status
  // exists in this pass (see plan's "explicitly out of scope").
  submittedByVendor: boolean;
};

export type VendorRateFormData = Omit<VendorRate, "id" | "createdAt" | "updatedAt" | "status" | "createdBy" | "supplierName">;

export type VendorAvailability = FirestoreRecord & {
  supplierId:   string;
  supplierName: string;
  resourceLabel: string; // "Standard Rooms", "Innova Fleet", "English-speaking guides"
  startDate: string; endDate: string; // YYYY-MM-DD
  unitsAvailable: number;
  notes: string | null;
  submittedByVendor: boolean;
};

export type VendorAvailabilityFormData = Omit<VendorAvailability, "id" | "createdAt" | "updatedAt" | "status" | "createdBy" | "supplierName">;
