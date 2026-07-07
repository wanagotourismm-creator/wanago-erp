import type { FieldValue } from "firebase/firestore";
import type { FirestoreRecord, Timestamp } from "@/types/global";
import type { InvoiceStatus } from "@/lib/constants";

export type InvoiceFinanceApprovalStatus = "pending" | "approved" | "rejected";

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

  // Mandatory Finance approval gate — every invoice starts "pending" and
  // must be approved before it can be marked sent. Editing a rejected
  // invoice automatically resets this to "pending" on save (see
  // updateInvoice) — that's the entire resubmit mechanism.
  financeApprovalStatus:  InvoiceFinanceApprovalStatus;
  financeApprovedBy:      string | null;
  financeApprovedAt:      Timestamp | Date | string | FieldValue | null;
  financeRejectedBy:      string | null;
  financeRejectedAt:      Timestamp | Date | string | FieldValue | null;
  financeRejectionReason: string | null;
};

export type InvoiceFormData = Omit<
  Invoice,
  | "id" | "createdAt" | "updatedAt" | "refNumber" | "status" | "balanceDue"
  | "financeApprovalStatus" | "financeApprovedBy" | "financeApprovedAt"
  | "financeRejectedBy" | "financeRejectedAt" | "financeRejectionReason"
>;
