import { z } from "zod";

export const onboardingChecklistDraftSchema = z.object({
  tasks: z.array(z.object({
    taskLabel: z.string(),
    stage: z.enum(["documentation", "it_setup", "orientation", "complete"]),
  })),
});

export type OnboardingChecklistDraft = z.infer<typeof onboardingChecklistDraftSchema>;

export const onboardingChecklistResponseSchema = {
  type: "OBJECT",
  properties: {
    tasks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          taskLabel: { type: "STRING" },
          stage: { type: "STRING", enum: ["documentation", "it_setup", "orientation", "complete"] },
        },
        required: ["taskLabel", "stage"],
      },
    },
  },
  required: ["tasks"],
};
