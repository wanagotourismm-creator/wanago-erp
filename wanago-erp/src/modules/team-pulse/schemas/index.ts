import { z } from "zod";

export const teamPulseResponseSchema = z.object({
  sentiment: z.coerce.number().int().min(1).max(5),
  comment:   z.string().max(500).optional().or(z.literal("")),
});

export type TeamPulseResponseSchema = z.infer<typeof teamPulseResponseSchema>;
