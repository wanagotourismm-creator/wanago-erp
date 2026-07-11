import { z } from "zod";

export const brochureDaySchema = z.object({
  dayNumber:    z.number(),
  title:        z.string().min(1, "Day title is required"),
  bulletPoints: z.array(z.string()).default([]),
  imageUrl:     z.string().default(""),
});

export const itineraryBrochureSchema = z.object({
  destination:  z.string().min(2, "Destination is required"),
  route:        z.string().optional().or(z.literal("")),
  tagline:      z.string().optional().or(z.literal("")),

  durationDays:   z.coerce.number().min(1, "Duration must be at least 1 day").default(1),
  durationNights: z.coerce.number().min(0, "Nights can't be negative").default(0),

  coverImageUrl: z.string().min(1, "Cover image is required"),

  days: z.array(brochureDaySchema).default([]),

  inclusions: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),

  termsAndConditions: z.string().min(1, "Terms & conditions are required"),

  contactPhones:   z.array(z.string()).default([]),
  officeAddresses: z.array(z.string()).default([]),

  customerName:  z.string().optional().or(z.literal("")),
  packagePrice:  z.coerce.number().optional(),

  brochureStatus: z.enum(["draft", "sent", "archived"]).default("draft"),
});

export type ItineraryBrochureSchema = z.infer<typeof itineraryBrochureSchema>;
