import { z } from "zod";

export const officeSchema = z.object({
  name:         z.string().min(2, "Office name is required"),
  code:         z.string().min(2, "Office code is required").toUpperCase(),
  address:      z.string().optional().or(z.literal("")),
  city:         z.string().optional().or(z.literal("")),
  phone:        z.string().optional().or(z.literal("")),
  isHeadOffice: z.boolean().default(false),
});

export type OfficeSchema = z.infer<typeof officeSchema>;
