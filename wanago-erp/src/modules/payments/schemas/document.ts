import { z } from "zod";
import { firestoreRecordSchema } from "@/lib/firebase/schemas";

// Validates a full Payment document as stored in Firestore. See
// invoices/schemas/document.ts for why this is separate from the
// create/edit form schema (there isn't one yet for payments) and passed
// to PaymentRepository for BaseRepository's Zod-validated reads.
export const paymentDocumentSchema = firestoreRecordSchema.extend({
  invoiceId: z.string().nullable(),
  invoiceRef: z.string().nullable(),

  customerId: z.string(),
  customerName: z.string(),

  amount: z.number(),
  paymentMethod: z.string(),
  paymentDate: z.string(),
  referenceNumber: z.string().nullable(),

  officeId: z.string(),
  officeName: z.string(),

  notes: z.string().nullable(),
  refNumber: z.string(),
});
