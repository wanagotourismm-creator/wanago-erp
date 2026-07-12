import { z } from "zod";

export const itineraryDaySchema = z.object({
  dayNumber:   z.number(),
  title:       z.string(),
  description: z.string(),
});

export const itinerarySchema = z.object({
  title:           z.string().min(2, "Title must be at least 2 characters"),
  destination:     z.string().min(2, "Destination is required"),
  durationDays:    z.coerce.number().min(1, "Duration must be at least 1 day").default(1),
  tripType:        z.string().optional().or(z.literal("")),
  packageName:     z.string().optional().or(z.literal("")),

  days:            z.array(itineraryDaySchema).default([]),

  tagline:         z.string().optional().or(z.literal("")),
  inclusions:      z.array(z.string()).default([]),
  exclusions:      z.array(z.string()).default([]),

  officeId:        z.string().min(1),
  officeName:      z.string().min(1),

  notes:           z.string().optional().or(z.literal("")),
  itineraryStatus: z.enum(["draft", "confirmed"]).default("draft"),
});

export type ItinerarySchema = z.infer<typeof itinerarySchema>;
