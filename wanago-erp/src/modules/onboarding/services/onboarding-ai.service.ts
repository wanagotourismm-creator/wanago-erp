import { auth } from "@/lib/firebase/client";
import type { OnboardingChecklistDraft } from "@/modules/onboarding/schemas/ai-draft.schema";

export type DraftChecklistInput = { role: string; department?: string };
export type DraftChecklistResult = { draft: OnboardingChecklistDraft } | { error: string };

export async function draftOnboardingChecklist(input: DraftChecklistInput): Promise<DraftChecklistResult> {
  try {
    const res = await fetch("/api/ai/onboarding-checklist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...input, createdBy: auth.currentUser?.uid ?? "unknown" }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Couldn't generate a checklist right now." };
    return { draft: data.draft as OnboardingChecklistDraft };
  } catch {
    return { error: "Couldn't reach the AI assistant. Check your connection." };
  }
}
