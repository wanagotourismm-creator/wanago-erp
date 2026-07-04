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
