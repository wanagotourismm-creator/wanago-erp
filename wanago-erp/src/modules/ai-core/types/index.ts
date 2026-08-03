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
  // Master kill switch for the whole AI Assistant / "AI employee" feature —
  // set from Admin > AI Employee. When false, /api/ai-assistant refuses all
  // requests and the chat FAB doesn't render at all, app-wide.
  aiEmployeeEnabled: boolean;
  // Separate, narrower switch — controls only the auto-fix PR pipeline
  // (src/modules/tickets/services/ai-bugfix.service.ts), which has a
  // materially different blast radius (GitHub write access) than the chat
  // assistant above. Off by default: this needs a GitHub token configured
  // under Admin > Integrations AND this switch on before it does anything.
  aiAutoFixEnabled: boolean;
  // Separate switch again — controls the customer-facing WhatsApp "digital
  // front desk" (src/modules/whatsapp-inbox/services/whatsapp-ai-reply.service.ts),
  // which replies to real customers, not staff. Off by default: distinct
  // trust boundary from both switches above.
  aiWhatsAppReplyEnabled: boolean;
  // Gates /api/cron/daily-ai-briefing — a daily "what needs attention today"
  // digest pushed to admins (in-app + email), reusing the same ranking as
  // the in-app Command Center widget. Off by default like the other
  // narrower switches; low risk (read-only, no writes) but still opt-in
  // since it emails every admin daily once on.
  aiDailyBriefingEnabled: boolean;
};

// One entry per AI-initiated write the user confirmed (or that failed after
// confirmation) — written server-side after the client executes the actual
// Firestore write, same admin-only-write trust boundary as AiUsageLog.
export type AiActionLog = FirestoreRecord & {
  tool:             string;
  argsSummary:      string;
  resultCollection: string | null;
  resultDocId:      string | null;
  outcome:          AiOutcome;
  errorMessage:     string | null;
};
