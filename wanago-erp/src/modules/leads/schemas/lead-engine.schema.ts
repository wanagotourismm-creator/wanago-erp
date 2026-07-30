import { z } from "zod";

export const leadEngineSchema = z.object({
  nextAction: z.string(),
  pitch:      z.string(),
});

export type LeadEngineDraft = z.infer<typeof leadEngineSchema>;

export const leadEngineResponseSchema = {
  type: "OBJECT",
  properties: {
    nextAction: { type: "STRING" },
    pitch:      { type: "STRING" },
  },
  required: ["nextAction", "pitch"],
};
