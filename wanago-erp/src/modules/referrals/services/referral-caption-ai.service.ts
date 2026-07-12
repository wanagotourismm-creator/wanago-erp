import { auth } from "@/lib/firebase/client";

export type DraftCaptionResult = { text: string } | { error: string };

export async function draftReferralCaption(title: string, destination: string | null): Promise<DraftCaptionResult> {
  try {
    const res = await fetch("/api/ai/referral-caption", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, destination, createdBy: auth.currentUser?.uid ?? "unknown" }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Couldn't draft a caption right now." };
    return { text: data.text as string };
  } catch {
    return { error: "Couldn't reach the AI assistant. Check your connection." };
  }
}
