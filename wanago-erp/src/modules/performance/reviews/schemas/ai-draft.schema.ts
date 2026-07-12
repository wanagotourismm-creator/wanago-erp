import { z } from "zod";

// Polishing, not generating — the AI only rephrases what the reviewer
// already typed into clearer, more professional language. It must never
// invent achievements/specifics that aren't in the manager's own notes,
// which is why the API route sends the manager's rough text as input and
// instructs the model not to add new claims.
export const reviewDraftSchema = z.object({
  strengths:           z.string(),
  areasForImprovement: z.string(),
  comments:            z.string(),
});

export type ReviewDraft = z.infer<typeof reviewDraftSchema>;

export const reviewDraftResponseSchema = {
  type: "OBJECT",
  properties: {
    strengths:           { type: "STRING" },
    areasForImprovement: { type: "STRING" },
    comments:            { type: "STRING" },
  },
  required: ["strengths", "areasForImprovement", "comments"],
};
