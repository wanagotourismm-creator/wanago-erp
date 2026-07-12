import { z } from "zod";

export const jobDraftSchema = z.object({
  description:  z.string(),
  requirements: z.string(),
});

export type JobDraft = z.infer<typeof jobDraftSchema>;

export const jobDraftResponseSchema = {
  type: "OBJECT",
  properties: {
    description:  { type: "STRING" },
    requirements: { type: "STRING" },
  },
  required: ["description", "requirements"],
};
