// Server-only — mirrors ai-usage-log.service.ts's trust boundary:
// aiActionLogs' Firestore rule is `write: if false`, so only this trusted
// Admin SDK path can write here. Records every AI-initiated write the user
// confirmed (or that failed after confirmation) for audit purposes.
import { getAdminDb } from "@/lib/firebase/admin";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { AiOutcome } from "@/modules/ai-core/types";

export type LogAiActionInput = {
  tool: string;
  argsSummary: string;
  createdBy: string;
  resultCollection: string | null;
  resultDocId: string | null;
  outcome: AiOutcome;
  errorMessage?: string | null;
};

// Never throws — a logging failure must not surface as if the underlying
// write (which already happened or failed client-side) itself failed.
export async function logAiAction(input: LogAiActionInput): Promise<void> {
  try {
    const dbAdmin = getAdminDb();
    if (!dbAdmin) return;

    await dbAdmin.collection(FIRESTORE_COLLECTIONS.AI_ACTION_LOGS).add({
      tool:             input.tool,
      argsSummary:      input.argsSummary,
      resultCollection: input.resultCollection,
      resultDocId:      input.resultDocId,
      outcome:          input.outcome,
      errorMessage:     input.errorMessage ?? null,
      createdAt:        new Date(),
      updatedAt:        new Date(),
      createdBy:        input.createdBy,
      status:           input.outcome,
    });
  } catch {
    // best-effort logging only
  }
}
