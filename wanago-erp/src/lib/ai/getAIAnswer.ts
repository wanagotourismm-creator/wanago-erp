// Server-only — imported exclusively by src/app/api/ai-assistant/route.ts.
// Never import this from client code: it reads raw API keys from
// process.env, which must not be bundled into the browser.

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

// Current free-tier-eligible models (verified against provider docs as of
// this writing — check ai.google.dev/gemini-api/docs/pricing and
// console.groq.com/docs/models if either provider starts erroring, since
// model names/availability change over time). The Gemini -> Groq -> KB-only
// fallback chain means a stale model name here degrades gracefully rather
// than breaking the assistant outright.
const GEMINI_MODEL = "gemini-3.5-flash";
const GROQ_MODEL = "llama-3.3-70b-versatile";

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

async function callGemini(apiKey: string, system: string, history: ChatTurn[], question: string): Promise<string> {
  const contents = [
    ...history.map((h) => ({ role: h.role === "assistant" ? "model" : "user", parts: [{ text: h.content }] })),
    { role: "user", parts: [{ text: question }] },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: { maxOutputTokens: 500, temperature: 0.2 },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini");
  return text;
}

async function callGroq(apiKey: string, system: string, history: ChatTurn[], question: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 500,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        ...history.map((h) => ({ role: h.role, content: h.content })),
        { role: "user", content: question },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from Groq");
  return text;
}

// Tries Gemini first, falls back to Groq on any failure (rate limit, error,
// timeout), and falls back to a kb-only signal if both fail or neither key
// is configured — callers use that signal to show the matched help
// article(s) directly instead of a broken/blank AI response.
export async function getAIAnswer(
  question: string,
  articles: ArticleContext[],
  history: ChatTurn[] = [],
  language: AILanguage = "en"
): Promise<AIAnswerResult> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const system = buildSystemPrompt(articles, language);

  if (geminiKey) {
    try {
      const answer = await callGemini(geminiKey, system, history, question);
      return { source: "gemini", answer };
    } catch {
      // fall through to Groq
    }
  }

  if (groqKey) {
    try {
      const answer = await callGroq(groqKey, system, history, question);
      return { source: "groq", answer };
    } catch {
      // fall through to kb-only
    }
  }

  return { source: "kb-only" };
}
