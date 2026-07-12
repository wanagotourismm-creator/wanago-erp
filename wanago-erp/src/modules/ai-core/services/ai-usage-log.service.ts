// Server-only — imported exclusively by geminiService.ts. Writes go through
// the Admin SDK (bypassing Firestore rules) the same way the sync-supabase
// cron writes systemUsage: aiUsageLogs' rule is `write: if false`, so no
// client of any role can write here directly, only this trusted server path.
import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { AiProvider, AiOutcome } from "@/modules/ai-core/types";

export type LogAiUsageInput = {
  feature: string;
  provider: AiProvider;
  model: string;
  outcome: AiOutcome;
  errorMessage?: string | null;
  promptChars: number;
  responseChars: number;
  latencyMs: number;
  createdBy: string;
};

// Never throws — a logging failure (e.g. FIREBASE_SERVICE_ACCOUNT_KEY unset
// in a local dev environment) must not break the actual AI call it's
// describing.
export async function logAiUsage(input: LogAiUsageInput): Promise<void> {
  try {
    const dbAdmin = getAdminDb();
    if (!dbAdmin) return;

    await dbAdmin.collection(FIRESTORE_COLLECTIONS.AI_USAGE_LOGS).add({
      feature:       input.feature,
      provider:      input.provider,
      model:         input.model,
      outcome:       input.outcome,
      errorMessage:  input.errorMessage ?? null,
      promptChars:   input.promptChars,
      responseChars: input.responseChars,
      latencyMs:     input.latencyMs,
      createdAt:     new Date(),
      updatedAt:     new Date(),
      createdBy:     input.createdBy,
      status:        input.outcome,
    });
  } catch {
    // best-effort logging only
  }
}
