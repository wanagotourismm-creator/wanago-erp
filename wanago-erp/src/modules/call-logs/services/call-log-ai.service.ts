import { auth } from "@/lib/firebase/client";

export type SuggestNextStepsInput = { notes: string; outcome: string; contactName?: string };
export type SuggestNextStepsResult = { text: string } | { error: string };

export async function suggestNextSteps(input: SuggestNextStepsInput): Promise<SuggestNextStepsResult> {
  try {
    const res = await fetch("/api/ai/call-next-steps", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...input, createdBy: auth.currentUser?.uid ?? "unknown" }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "AI suggestions aren't available right now." };
    return { text: data.text as string };
  } catch {
    return { error: "Couldn't reach the AI assistant. Check your connection." };
  }
}
