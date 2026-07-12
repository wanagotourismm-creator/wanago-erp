import { auth } from "@/lib/firebase/client";
import type { ItineraryDraft } from "@/modules/itineraries/schemas/ai-draft.schema";

export type DraftItineraryInput = {
  destination: string;
  durationDays: number;
  tripType?: string;
};

export type DraftItineraryResult =
  | { draft: ItineraryDraft }
  | { error: string };

export async function draftItinerary(input: DraftItineraryInput): Promise<DraftItineraryResult> {
  try {
    const res = await fetch("/api/ai/itinerary-draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...input, createdBy: auth.currentUser?.uid ?? "unknown" }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Couldn't generate a draft right now." };
    return { draft: data.draft as ItineraryDraft };
  } catch {
    return { error: "Couldn't reach the AI assistant. Check your connection." };
  }
}
