import { z } from "zod";

// The unified assistant's per-turn decision, emitted via
// geminiService.generateStructured() (see ai-assistant-orchestrator.ts).
// Kept as one flat schema (rather than a discriminated union) because
// Gemini's responseSchema is a fixed JSON Schema shape, not
// per-tool-dynamic — tool args are emitted as a JSON string and validated
// separately against each tool's own Zod schema once parsed.
export const assistantDecisionSchema = z.object({
  action: z.enum(["call_tool", "propose_write", "respond"]),
  toolName: z.string().optional(),
  toolArgsJson: z.string().optional(),
  proposedSummary: z.string().optional(),
  finalAnswer: z.string().optional(),
});

export type AssistantDecision = z.infer<typeof assistantDecisionSchema>;

export const assistantDecisionResponseSchema = {
  type: "OBJECT",
  properties: {
    action: { type: "STRING", enum: ["call_tool", "propose_write", "respond"] },
    toolName: { type: "STRING" },
    toolArgsJson: { type: "STRING" },
    proposedSummary: { type: "STRING" },
    finalAnswer: { type: "STRING" },
  },
  required: ["action"],
};
