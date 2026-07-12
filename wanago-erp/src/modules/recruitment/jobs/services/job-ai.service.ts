import { auth } from "@/lib/firebase/client";
import type { JobDraft } from "@/modules/recruitment/jobs/schemas/ai-draft.schema";

export type DraftJobInput = { title: string; department?: string; location?: string; employmentType?: string };
export type DraftJobResult = { draft: JobDraft } | { error: string };

export async function draftJobDescription(input: DraftJobInput): Promise<DraftJobResult> {
  try {
    const res = await fetch("/api/ai/job-draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...input, createdBy: auth.currentUser?.uid ?? "unknown" }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Couldn't generate a draft right now." };
    return { draft: data.draft as JobDraft };
  } catch {
    return { error: "Couldn't reach the AI assistant. Check your connection." };
  }
}
