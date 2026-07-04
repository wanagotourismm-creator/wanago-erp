import { z } from "zod";

export const paymentSchema = z.object({
  invoiceId:       z.string().optional().or(z.literal("")),
  invoiceRef:      z.string().optional().or(z.literal("")),

  customerId:      z.string().min(1, "Customer is required"),
  customerName:    z.string().min(1),

  amount:          z.coerce.number().min(1, "Amount must be greater than 0"),
  paymentMethod:   z.string().min(1, "Payment method is required"),
  paymentDate:     z.string().min(1, "Payment date is required"),
  referenceNumber: z.string().optional().or(z.literal("")),

  officeId:        z.string().min(1),
  officeName:      z.string().min(1),
  notes:           z.string().optional().or(z.literal("")),
});

export type PaymentSchema = z.infer<typeof paymentSchema>;
