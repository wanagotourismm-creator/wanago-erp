import { z } from "zod";

const optionalNumber = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return undefined;
  if (typeof v === "number" && Number.isNaN(v)) return undefined;
  return v;
}, z.number().optional());

export const officeSchema = z.object({
  name:         z.string().min(2, "Office name is required"),
  code:         z.string().min(2, "Office code is required").toUpperCase(),
  address:      z.string().optional().or(z.literal("")),
  city:         z.string().optional().or(z.literal("")),
  phone:        z.string().optional().or(z.literal("")),
  isHeadOffice: z.boolean().default(false),
  latitude:             optionalNumber,
  longitude:            optionalNumber,
  geofenceRadiusMeters: optionalNumber,
});

export type OfficeSchema = z.infer<typeof officeSchema>;
