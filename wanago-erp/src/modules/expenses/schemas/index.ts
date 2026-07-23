import { z } from "zod";

export const expenseSchema = z.object({
  category:      z.string().min(1, "Category is required"),
  amount:        z.coerce.number().min(0.01, "Amount must be greater than 0"),
  expenseDate:   z.string().min(1, "Expense date is required"),
  vendor:        z.string().optional().or(z.literal("")),
  description:   z.string().min(1, "Description is required"),

  bookingId:     z.string().optional().or(z.literal("")),
  bookingRef:    z.string().optional().or(z.literal("")),

  officeId:      z.string().min(1),
  officeName:    z.string().min(1),
  notes:         z.string().optional().or(z.literal("")),

  expenseStatus: z.enum(["pending", "approved", "paid", "rejected"]).default("pending"),
});

export type ExpenseSchema = z.infer<typeof expenseSchema>;
