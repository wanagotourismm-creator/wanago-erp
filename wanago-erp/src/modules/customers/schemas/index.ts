import { z } from "zod";

export const customerSchema = z.object({
  fullName:       z.string().min(2, "Name must be at least 2 characters"),
  email:          z.string().email("Invalid email").optional().or(z.literal("")),
  phone:          z.string().min(10, "Enter a valid phone number"),
  alternatePhone: z.string().optional().or(z.literal("")),

  customerType:   z.string().min(1, "Customer type is required"),
  city:           z.string().optional().or(z.literal("")),
  address:        z.string().optional().or(z.literal("")),

  source:         z.string().min(1, "Source is required"),
  officeId:       z.string().min(1),
  officeName:     z.string().min(1),

  assignedTo:     z.string().optional().or(z.literal("")),
  agentName:      z.string().optional().or(z.literal("")),

  notes:          z.string().optional().or(z.literal("")),

  // Form-only — resolved to referredByCustomerId at submit time (see
  // CustomersPage.handleSubmit), not stored on the Customer as-is.
  referralCodeEntered: z.string().optional().or(z.literal("")),
});

export type CustomerSchema = z.infer<typeof customerSchema>;
