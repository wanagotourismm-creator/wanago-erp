import { z } from "zod";

export const packageSchema = z.object({
  title:          z.string().min(2, "Title must be at least 2 characters"),
  destination:    z.string().min(2, "Destination is required"),
  category:       z.string().min(1, "Category is required"),

  durationDays:   z.coerce.number().min(0).optional().default(0),
  durationNights: z.coerce.number().min(0).optional().default(0),
  basePrice:      z.coerce.number().min(0).optional().default(0),
  costPrice:      z.coerce.number().min(0).optional().default(0),

  inclusions:     z.string().optional().or(z.literal("")),
  exclusions:     z.string().optional().or(z.literal("")),

  validFrom:      z.string().optional().or(z.literal("")),
  validTo:        z.string().optional().or(z.literal("")),

  officeId:       z.string().min(1),
  officeName:     z.string().min(1),
  notes:          z.string().optional().or(z.literal("")),

  packageStatus:  z.enum(["active", "inactive"]).optional().default("active"),
});

export type PackageSchema = z.infer<typeof packageSchema>;
