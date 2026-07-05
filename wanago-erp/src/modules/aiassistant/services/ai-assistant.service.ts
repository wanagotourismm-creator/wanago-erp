import { searchHelpArticles } from "@/modules/helpcenter/services/help-article.service";
import type { HelpArticle } from "@/modules/helpcenter/types";
import type { AIAnswerSource } from "@/modules/aiassistant/types";

export type AssistantTurn = { role: "user" | "assistant"; content: string };

export type AssistantAnswer = {
  answer:   string;
  source:   AIAnswerSource;
  articles: HelpArticle[];
};

// Retrieval happens client-side (same pattern as every other module's
// Firestore reads) — only the privileged Gemini/Groq calls go through the
// server route, since those need API keys that must never reach the client.
export async function askAssistant(question: string, history: AssistantTurn[]): Promise<AssistantAnswer> {
  const articles = await searchHelpArticles(question);

  if (articles.length === 0) {
    return { answer: "I don't have documentation on that yet.", source: "no-match", articles: [] };
  }

  try {
    const res = await fetch("/api/ai-assistant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        question,
        history,
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
