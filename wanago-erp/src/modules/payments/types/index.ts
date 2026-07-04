import type { FirestoreRecord } from "@/types/global";

export type Payment = FirestoreRecord & {
  invoiceId:       string | null;
  invoiceRef:      string | null;

  customerId:      string;
  customerName:    string;

  amount:          number;
  paymentMethod:   string;
  paymentDate:     string;
  referenceNumber: string | null;

  officeId:        string;
  officeName:      string;

  notes:           string | null;
  refNumber:       string;
};

export type PaymentFormData = Omit<
  Payment,
  "id" | "createdAt" | "updatedAt" | "refNumber" | "status"
>;
