import { z } from "zod";

export const quotationLineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount:      z.coerce.number().min(0, "Amount must be 0 or more"),
});

export const quotationSchema = z.object({
  customerId:    z.string().min(1, "Customer is required"),
  customerName:  z.string().min(1),
  customerPhone: z.string().min(1),

  destination:   z.string().min(1, "Destination is required"),
  packageId:     z.string().optional().or(z.literal("")),
  packageName:   z.string().optional().or(z.literal("")),

  pax:           z.coerce.number().min(1, "At least 1 pax is required").default(1),

  lineItems:     z.array(quotationLineItemSchema).min(1, "Add at least one line item"),
  taxRate:       z.coerce.number().min(0).optional().nullable(),

  validUntil:    z.string().optional().or(z.literal("")),

  officeId:      z.string().min(1),
  officeName:    z.string().min(1),
  notes:         z.string().optional().or(z.literal("")),
});

export type QuotationSchema = z.infer<typeof quotationSchema>;
