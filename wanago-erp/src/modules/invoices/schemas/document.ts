import { z } from "zod";
import { firestoreRecordSchema, timestampSchema } from "@/lib/firebase/schemas";

// Validates a full Invoice document as stored in Firestore — distinct from
// invoiceSchema (schemas/index.ts), which validates the create/edit form
// and neither has nor needs id/status/approval fields. Passed to
// InvoiceRepository so BaseRepository can catch a malformed document
// before it reaches a page (see PRD Pillar 1, "Zod-validated Firestore
// reads"). Money/identity fields are required; everything else stays
// nullable/optional to match what Invoice's type already allows, so a
// legitimate older document is never rejected just for missing a
// since-added optional field.
export const invoiceDocumentSchema = firestoreRecordSchema.extend({
  bookingId: z.string().nullable(),
  bookingRef: z.string().nullable(),

  customerId: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),

  totalAmount: z.number(),
  amountPaid: z.number(),
  balanceDue: z.number(),

  taxRate: z.number().nullable().optional(),
  taxAmount: z.number().nullable().optional(),

  issueDate: z.string(),
  dueDate: z.string().nullable(),

  status: z.string().min(1),

  officeId: z.string(),
  officeName: z.string(),

  notes: z.string().nullable(),
  refNumber: z.string(),

  financeApprovalStatus: z.string(),
  financeApprovedBy: z.string().nullable(),
  financeApprovedAt: timestampSchema.optional(),
  financeRejectedBy: z.string().nullable(),
  financeRejectedAt: timestampSchema.optional(),
  financeRejectionReason: z.string().nullable(),
});
