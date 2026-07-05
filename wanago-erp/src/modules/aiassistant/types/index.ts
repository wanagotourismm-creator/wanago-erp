import type { HelpArticle } from "@/modules/helpcenter/types";

export type AIAnswerSource = "gemini" | "groq" | "kb-only" | "no-match";

export type AIChatMessage = {
  id:       string;
  role:     "user" | "assistant";
  content:  string;
  source?:  AIAnswerSource;
  articles?: HelpArticle[];
};
