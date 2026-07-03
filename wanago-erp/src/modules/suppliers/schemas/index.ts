import { z } from "zod";

export const supplierSchema = z.object({
  name:          z.string().min(2, "Name is required"),
  category:      z.enum(["hotel","airline","transport","cruise","visa","insurance","activity","restaurant","other"]),
  contactName:   z.string().optional().or(z.literal("")),
  phone:         z.string().min(10, "Valid phone required"),
  email:         z.string().email("Invalid email").optional().or(z.literal("")),
  website:       z.string().optional().or(z.literal("")),
  country:       z.string().min(1, "Country required"),
  city:          z.string().optional().or(z.literal("")),
  address:       z.string().optional().or(z.literal("")),
  gstNumber:     z.string().optional().or(z.literal("")),
  panNumber:     z.string().optional().or(z.literal("")),
  bankName:      z.string().optional().or(z.literal("")),
  accountNumber: z.string().optional().or(z.literal("")),
  ifscCode:      z.string().optional().or(z.literal("")),
  rating:        z.coerce.number().min(1).max(5).default(3),
  tags:          z.array(z.string()).default([]),
  notes:         z.string().optional().or(z.literal("")),
  officeId:      z.string().min(1),
  officeName:    z.string().min(1),
});

export type SupplierSchema = z.infer<typeof supplierSchema>;
