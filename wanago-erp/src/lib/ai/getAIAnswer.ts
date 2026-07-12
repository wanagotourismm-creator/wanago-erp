// Server-only — imported exclusively by src/app/api/ai-assistant/route.ts.
// Never import this from client code: it ultimately reaches geminiService,
// which reads raw API keys from process.env that must not be bundled into
// the browser. Only builds the help-assistant-specific system prompt now —
// the actual Gemini/Groq calls, fallback chain, and usage logging live in
// the shared src/modules/ai-core/services/geminiService.ts.
import { generateText, AiGenerationError } from "@/modules/ai-core/services/geminiService";

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type ArticleContext = { title: string; content: string };
export type AILanguage = "en" | "ml";
export type AIAnswerResult =
  | { source: "gemini" | "groq"; answer: string }
  | { source: "kb-only" };

const LANGUAGE_NAMES: Record<AILanguage, string> = {
  en: "English",
  ml: "Malayalam",
};

function buildSystemPrompt(articles: ArticleContext[], language: AILanguage): string {
  const context = articles
    .map((a, i) => `Article ${i + 1}: ${a.title}\n${a.content}`)
    .join("\n\n---\n\n");

  const languageName = LANGUAGE_NAMES[language];

  return [
    "You are the internal Help Assistant for Wanago ERP, a travel-agency operations system used by internal staff.",
    "Answer the staff member's question about HOW TO USE this software, using ONLY the help documentation provided below as context — never your own general knowledge about software or ERPs.",
    "If the provided context does not actually answer the question, say plainly that you don't have documentation on that yet. Do not guess or improvise.",
    "If the question is unrelated to using this ERP (general knowledge, personal advice, coding help, current events, etc.), politely decline and remind the user you can only help with using Wanago ERP.",
    `Respond ONLY in ${languageName}, regardless of what language the help documentation context below is written in — translate/rephrase the relevant content into ${languageName} yourself.`,
    "Be concise and direct. Respond in plain text, no markdown headers or code fences.",
    "",
    "Help documentation context:",
    "",
    context,
  ].join("\n");
}

// Falls back to a kb-only signal if both providers fail or neither key is
// configured — callers use that signal to show the matched help article(s)
// directly instead of a broken/blank AI response.
export async function getAIAnswer(
  question: string,
  articles: ArticleContext[],
  history: ChatTurn[] = [],
  language: AILanguage = "en",
  createdBy: string = "unknown"
): Promise<AIAnswerResult> {
  const system = buildSystemPrompt(articles, language);

  try {
    const { text, provider } = await generateText({
      feature: "help-assistant",
      system,
      prompt: question,
      history,
      createdBy,
    });
    return { source: provider, answer: text };
  } catch (err) {
    if (!(err instanceof AiGenerationError)) throw err;
    return { source: "kb-only" };
  }
}
