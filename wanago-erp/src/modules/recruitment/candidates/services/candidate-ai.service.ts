import { auth } from "@/lib/firebase/client";

export type SummarizeResumeResult = { text: string } | { error: string };

export async function summarizeResume(resumeUrl: string): Promise<SummarizeResumeResult> {
  try {
    const res = await fetch("/api/ai/resume-summary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resumeUrl, createdBy: auth.currentUser?.uid ?? "unknown" }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Couldn't summarize this resume right now." };
    return { text: data.text as string };
  } catch {
    return { error: "Couldn't reach the AI assistant. Check your connection." };
  }
}
