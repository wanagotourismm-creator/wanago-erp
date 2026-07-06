import type { FirestoreRecord } from "@/types/global";
import type { InvoiceStatus } from "@/lib/constants";

export type Invoice = Omit<FirestoreRecord, "status"> & {
  bookingId:    string | null;
  bookingRef:   string | null;

  customerId:   string;
  customerName: string;
  customerPhone: string;

  totalAmount:  number;
  amountPaid:   number;
  balanceDue:   number;

  // Additive breakdown for the PDF/UI only — totalAmount stays the
  // authoritative figure the rest of the app (balanceDue, payments) relies
  // on. Optional so existing callers (e.g. bulk import) don't need to set
  // them; both null/absent when GST is disabled company-wide.
  taxRate?:     number | null;
  taxAmount?:   number | null;

  issueDate:    string;
  dueDate:      string | null;

  status:       InvoiceStatus;

  officeId:     string;
  officeName:   string;

  notes:        string | null;
  refNumber:    string;
};

export type InvoiceFormData = Omit<
  Invoice,
  "id" | "createdAt" | "updatedAt" | "refNumber" | "status" | "balanceDue"
>;
