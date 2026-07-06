import { z } from "zod";

export const invoiceSchema = z.object({
  bookingId:     z.string().optional().or(z.literal("")),
  bookingRef:    z.string().optional().or(z.literal("")),

  customerId:    z.string().min(1, "Customer is required"),
  customerName:  z.string().min(1),
  customerPhone: z.string().min(1),

  totalAmount:   z.coerce.number().min(0, "Total amount is required"),
  amountPaid:    z.coerce.number().min(0).default(0),
  taxRate:       z.coerce.number().min(0).optional().nullable(),
  taxAmount:     z.coerce.number().min(0).optional().nullable(),

  issueDate:     z.string().min(1, "Issue date is required"),
  dueDate:       z.string().optional().or(z.literal("")),

  officeId:      z.string().min(1),
  officeName:    z.string().min(1),
  notes:         z.string().optional().or(z.literal("")),
});

export type InvoiceSchema = z.infer<typeof invoiceSchema>;
