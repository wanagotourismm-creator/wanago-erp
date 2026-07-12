import { auth } from "@/lib/firebase/client";
import type { QuoteDraft } from "@/modules/quotations/schemas/ai-draft.schema";

export type DraftQuoteInput = { destination: string; pax: number; packageName?: string };
export type DraftQuoteResult = { draft: QuoteDraft } | { error: string };

export async function draftQuoteLineItems(input: DraftQuoteInput): Promise<DraftQuoteResult> {
  try {
    const res = await fetch("/api/ai/quote-draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...input, createdBy: auth.currentUser?.uid ?? "unknown" }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Couldn't generate suggestions right now." };
    return { draft: data.draft as QuoteDraft };
  } catch {
    return { error: "Couldn't reach the AI assistant. Check your connection." };
  }
}
