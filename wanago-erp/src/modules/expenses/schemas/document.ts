import { z } from "zod";
import { firestoreRecordSchema } from "@/lib/firebase/schemas";

// Validates a full Expense document as stored in Firestore. See
// invoices/schemas/document.ts for why this is separate from the
// create/edit form schema and passed to ExpenseRepository for
// BaseRepository's Zod-validated reads.
export const expenseDocumentSchema = firestoreRecordSchema.extend({
  category: z.string(),
  amount: z.number(),
  expenseDate: z.string(),
  vendor: z.string().nullable(),
  description: z.string(),
  receiptUrl: z.string().nullable(),
  officeId: z.string(),
  officeName: z.string(),
  notes: z.string().nullable(),
  refNumber: z.string(),
  expenseStatus: z.string(),
});
