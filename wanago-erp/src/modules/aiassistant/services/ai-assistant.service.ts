import { searchHelpArticles } from "@/modules/helpcenter/services/help-article.service";
import type { HelpArticle } from "@/modules/helpcenter/types";
import type { AIAnswerSource } from "@/modules/aiassistant/types";
import type { AILanguage } from "@/lib/ai/getAIAnswer";
import { auth } from "@/lib/firebase/client";

export type AssistantTurn = { role: "user" | "assistant"; content: string };

export type AssistantAnswer = {
  answer:   string;
  source:   AIAnswerSource;
  articles: HelpArticle[];
};

const NO_MATCH_MESSAGE: Record<AILanguage, string> = {
  en: "I don't have documentation on that yet.",
  ml: "എനിക്ക് ഇതിനെക്കുറിച്ച് ഇതുവരെ വിവരങ്ങൾ ലഭ്യമല്ല.",
};

// Retrieval happens client-side (same pattern as every other module's
// Firestore reads) — only the privileged Gemini/Groq calls go through the
// server route, since those need API keys that must never reach the client.
// The knowledge base itself is written in English, so retrieval always
// searches on the English text of `question` (for voice input in Malayalam,
// that's the Whisper *translation*, not the raw transcript — see
// transcribeAudio below) — but the final answer comes back in whichever
// language the caller asks for via `language`.
export async function askAssistant(
  question: string,
  history: AssistantTurn[],
  language: AILanguage = "en"
): Promise<AssistantAnswer> {
  const articles = await searchHelpArticles(question);

  if (articles.length === 0) {
    return { answer: NO_MATCH_MESSAGE[language], source: "no-match", articles: [] };
  }

  try {
    const res = await fetch("/api/ai-assistant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        question,
        history,
        language,
        createdBy: auth.currentUser?.uid ?? "unknown",
        articles: articles.map((a) => ({ title: a.title, content: a.content })),
      }),
    });

    if (!res.ok) return { answer: "", source: "kb-only", articles };

    const data = await res.json();
    if ((data.source === "gemini" || data.source === "groq") && typeof data.answer === "string") {
      return { answer: data.answer, source: data.source, articles };
    }
    return { answer: "", source: "kb-only", articles };
  } catch {
    return { answer: "", source: "kb-only", articles };
  }
}

export type TranscribeResult = { text: string } | { error: string };

// Uses Groq's Whisper — when language is Malayalam, hits the *translation*
// endpoint so the returned text is already in English (matching the
// knowledge base's language and giving reliable keyword retrieval); for
// English it just transcribes normally. The employee's spoken words are
// still answered back in their chosen language via `language` in
// askAssistant, independent of what text was actually searched on.
export async function transcribeAudio(blob: Blob, language: AILanguage): Promise<TranscribeResult> {
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
