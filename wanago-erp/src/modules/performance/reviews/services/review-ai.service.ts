import { auth } from "@/lib/firebase/client";
import type { ReviewDraft } from "@/modules/performance/reviews/schemas/ai-draft.schema";

export type PolishReviewInput = {
  employeeName?: string; rating?: string;
  strengths?: string; areasForImprovement?: string; comments?: string;
};
export type PolishReviewResult = { draft: ReviewDraft } | { error: string };

export async function polishReviewNotes(input: PolishReviewInput): Promise<PolishReviewResult> {
  try {
    const res = await fetch("/api/ai/review-draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...input, createdBy: auth.currentUser?.uid ?? "unknown" }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Couldn't polish these notes right now." };
    return { draft: data.draft as ReviewDraft };
  } catch {
    return { error: "Couldn't reach the AI assistant. Check your connection." };
  }
}
