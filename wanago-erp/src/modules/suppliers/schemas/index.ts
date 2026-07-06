import { z } from "zod";

export const supplierSchema = z.object({
  name:           z.string().min(2, "Name must be at least 2 characters"),
  category:       z.string().min(1, "Category is required"),
  contactPerson:  z.string().min(2, "Contact person is required"),
  phone:          z.string().min(10, "Enter a valid phone number"),
  email:          z.string().email("Invalid email").optional().or(z.literal("")),
  address:        z.string().optional().or(z.literal("")),
  city:           z.string().optional().or(z.literal("")),
  gstNumber:      z.string().optional().or(z.literal("")),
  paymentTerms:   z.string().optional().or(z.literal("")),
  officeId:       z.string().min(1),
  officeName:     z.string().min(1),
  notes:          z.string().optional().or(z.literal("")),
  supplierStatus: z.enum(["active", "inactive"]).default("active"),
});

export type SupplierSchema = z.infer<typeof supplierSchema>;
