import { auth } from "@/lib/firebase/client";
import { createLead } from "@/modules/leads/services/lead.service";
import { createQuotation } from "@/modules/quotations/services/quotation.service";
import type { LeadFormData } from "@/modules/leads/types";
import type { QuotationFormData } from "@/modules/quotations/types";
import type { AILanguage } from "@/lib/ai/getAIAnswer";

export type AssistantTurn = { role: "user" | "assistant"; content: string };

export type AskAssistantResult =
  | { kind: "answer"; text: string }
  | { kind: "proposal"; tool: string; args: unknown; summary: string }
  | { kind: "error"; message: string };

// The unified assistant endpoint requires a verified caller (it can trigger
// write-tool proposals), so every request carries the current Firebase ID
// token — unlike the old help-only/HR-only routes, which had no server
// identity check at all.
export async function askAssistant(question: string, history: AssistantTurn[], language: AILanguage = "en"): Promise<AskAssistantResult> {
  const idToken = await auth.currentUser?.getIdToken().catch(() => null);
  if (!idToken) return { kind: "error", message: "Please sign in to use the assistant." };

  try {
    const res = await fetch("/api/ai-assistant", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ question, history, language }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) return { kind: "error", message: data.error || "Something went wrong." };
    if (data.kind === "answer" && typeof data.text === "string") return { kind: "answer", text: data.text };
    if (data.kind === "proposal" && typeof data.tool === "string") {
      return { kind: "proposal", tool: data.tool, args: data.args, summary: data.summary };
    }
    return { kind: "error", message: "Got an unexpected response from the assistant." };
  } catch {
    return { kind: "error", message: "Couldn't reach the assistant. Check your connection." };
  }
}

export type ConfirmActionResult = { ok: true; docId: string } | { ok: false; error: string };

// Executes an AI-proposed write via the exact same service functions the
// manual forms use (createLead/createQuotation), preserving identical
// firestore.rules authorization and business logic. autoSend is always
// forced false for AI-created quotations — no customer-facing side effect
// from an AI action. Logs the outcome (best-effort) for audit.
export async function confirmProposedAction(tool: string, args: unknown, summary: string): Promise<ConfirmActionResult> {
  const uid = auth.currentUser?.uid;
  if (!uid) return { ok: false, error: "Please sign in to confirm this action." };

  let resultCollection: string | null = null;
  let resultDocId: string | null = null;
  let outcome: "success" | "error" = "success";
  let errorMessage: string | undefined;

  try {
    if (tool === "createLead") {
      const lead = await createLead(args as LeadFormData, uid);
      resultCollection = "leads";
      resultDocId = lead.id;
    } else if (tool === "createQuotation") {
      const quotation = await createQuotation(args as QuotationFormData, uid, { autoSend: false });
      resultCollection = "quotations";
      resultDocId = quotation.id;
    } else {
      throw new Error(`Unknown action tool: ${tool}`);
    }
  } catch (err) {
    outcome = "error";
    errorMessage = err instanceof Error ? err.message : "Unknown error";
  }

  const idToken = await auth.currentUser?.getIdToken().catch(() => null);
  if (idToken) {
    fetch("/api/ai-assistant/log-action", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ tool, argsSummary: summary, resultCollection, resultDocId, outcome, errorMessage }),
    }).catch(() => {});
  }

  if (outcome === "error") return { ok: false, error: errorMessage ?? "Failed to create the record." };
  return { ok: true, docId: resultDocId! };
}

export type TranscribeResult = { text: string } | { error: string };

// Uses Groq's Whisper — when language is Malayalam, hits the *translation*
// endpoint so the returned text is already in English; for English it just
// transcribes normally.
export async function transcribeAudio(blob: Blob, language: "en" | "ml"): Promise<TranscribeResult> {
  try {
    const form = new FormData();
    form.set("file", blob, "recording.webm");
    form.set("language", language);

    const res = await fetch("/api/ai-assistant/transcribe", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) return { error: data.error || "Voice input isn't available right now." };
    if (typeof data.text !== "string" || !data.text) return { error: "Couldn't hear anything — please try again." };
    return { text: data.text };
  } catch {
    return { error: "Voice input is temporarily unavailable." };
  }
}
