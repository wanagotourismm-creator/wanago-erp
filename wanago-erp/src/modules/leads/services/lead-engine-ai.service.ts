import { auth } from "@/lib/firebase/client";
import type { LeadEngineDraft } from "@/modules/leads/schemas/lead-engine.schema";

export type LeadEngineRequest = {
  leadName: string; destination: string; tripType: string | null;
  pax: number | null; budget: number | null; travelDate: string | null;
  stage: string; priority: string; quotationStatus: string | null;
  recentCallLogs: { outcome: string; notes: string | null; daysAgo: number }[];
  score: number; band: string; reasons: string[];
};

export async function getLeadEngineSuggestion(input: LeadEngineRequest): Promise<LeadEngineDraft | { error: string }> {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    const res = await fetch("/api/ai/lead-engine", {
      method: "POST",
      headers: { "content-type": "application/json", ...(idToken ? { authorization: `Bearer ${idToken}` } : {}) },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Couldn't generate a recommendation right now." };
    return data as LeadEngineDraft;
  } catch {
    return { error: "Couldn't reach the AI assistant. Check your connection." };
  }
}
