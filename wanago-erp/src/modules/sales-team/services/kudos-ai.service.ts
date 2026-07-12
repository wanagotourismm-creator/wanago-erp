import { auth } from "@/lib/firebase/client";

export type DraftKudosInput = {
  agentName: string; monthLabel?: string;
  revenue: number; bookingsConfirmed: number; leadsWon: number; conversionRate: number;
};
export type DraftKudosResult = { text: string } | { error: string };

export async function draftKudos(input: DraftKudosInput): Promise<DraftKudosResult> {
  try {
    const res = await fetch("/api/ai/kudos-draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...input, createdBy: auth.currentUser?.uid ?? "unknown" }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Couldn't draft this right now." };
    return { text: data.text as string };
  } catch {
    return { error: "Couldn't reach the AI assistant. Check your connection." };
  }
}
