import type { FirestoreRecord } from "@/types/global";

export type HelpArticle = FirestoreRecord & {
  title:       string;
  category:    string;
  content:     string;
  keywords:    string[];
  lastUpdated: string;
};

export type HelpArticleFormData = Omit<HelpArticle, "id" | "createdAt" | "updatedAt" | "status">;
