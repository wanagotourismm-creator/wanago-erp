import { z } from "zod";

export const campaignSchema = z.object({
  name:           z.string().min(2, "Name must be at least 2 characters"),
  channel:        z.string().min(1, "Channel is required"),
  campaignType:   z.string().optional().or(z.literal("")),
  startDate:      z.string().min(1, "Start date is required"),
  endDate:        z.string().optional().or(z.literal("")),
  budget:         z.coerce.number().optional().nullable(),

  officeId:       z.string().min(1),
  officeName:     z.string().min(1),
  notes:          z.string().optional().or(z.literal("")),

  campaignStatus: z.enum(["draft", "active", "paused", "completed"]).default("draft"),
});

export type CampaignSchema = z.infer<typeof campaignSchema>;
