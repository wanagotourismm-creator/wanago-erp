import type { FirestoreRecord } from "@/types/global";

export type AiProvider = "gemini" | "groq";
export type AiOutcome  = "success" | "error";

// One entry per model call, written server-side by geminiService itself —
// callers never write this directly, same as CronCreate-style audit
// collections elsewhere in the app. `feature` is a free-text tag (e.g.
// "help-assistant", "itinerary-draft") rather than a closed enum, since new
// AI features will keep getting added across phases and none of this data
// is validated/branched on by code — it's read-only reporting.
export type AiUsageLog = FirestoreRecord & {
  feature:       string;
  provider:      AiProvider;
  model:         string;
  outcome:       AiOutcome;
  errorMessage:  string | null;
  promptChars:   number;
  responseChars: number;
  latencyMs:     number;
};

// Model/prompt tuning knobs, stored at settings/aiSettings (same doc-per-id
// pattern as CompanySettings) so they can change without a redeploy.
export type AiSettings = {
  geminiModel: string;
  groqModel:   string;
  temperature: number;
  maxOutputTokens: number;
};
