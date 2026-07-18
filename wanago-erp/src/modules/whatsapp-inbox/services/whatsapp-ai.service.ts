import { auth } from "@/lib/firebase/client";
import type { WhatsAppMessage } from "@/modules/whatsapp-inbox/types";

type AiResult = { text: string } | { error: string };

async function callAssist(payload: Record<string, unknown>): Promise<AiResult> {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    const res = await fetch("/api/ai/whatsapp-assist", {
      method: "POST",
      headers: { "content-type": "application/json", ...(idToken ? { authorization: `Bearer ${idToken}` } : {}) },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "AI assist isn't available right now." };
    return { text: data.text as string };
  } catch {
    return { error: "Couldn't reach the AI assistant. Check your connection." };
  }
}

function toThreadMessages(messages: WhatsAppMessage[]) {
  return messages.map((m) => ({ direction: m.direction, body: m.body }));
}

export function suggestReply(messages: WhatsAppMessage[], customerName: string | null): Promise<AiResult> {
  return callAssist({ mode: "suggest-reply", messages: toThreadMessages(messages), customerName });
}

export function summarizeThread(messages: WhatsAppMessage[], customerName: string | null): Promise<AiResult> {
  return callAssist({ mode: "summarize", messages: toThreadMessages(messages), customerName });
}

export function translateText(text: string, targetLanguage: "en" | "ml"): Promise<AiResult> {
  return callAssist({ mode: "translate", text, targetLanguage });
}
