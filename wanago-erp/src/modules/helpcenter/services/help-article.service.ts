import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { HelpArticle } from "@/modules/helpcenter/types";
import type { HelpArticleSchema } from "@/modules/helpcenter/schemas";

class HelpArticleRepository extends BaseRepository<HelpArticle> {
  constructor() { super(FIRESTORE_COLLECTIONS.HELP_ARTICLES); }
}
const repo = new HelpArticleRepository();

// Sorted client-side (not via Firestore orderBy) — same reasoning as the
// rest of the app: avoids composite-index requirements and the silent
// exclusion of documents missing the sort field.
export async function fetchHelpArticles(): Promise<HelpArticle[]> {
  const articles = await repo.findMany({});
  return articles.sort((a, b) => a.title.localeCompare(b.title));
}

export async function createHelpArticle(data: HelpArticleSchema, createdBy: string): Promise<HelpArticle> {
  return repo.create({ ...data, createdBy, status: "active" });
}

export async function updateHelpArticle(id: string, data: Partial<HelpArticleSchema>): Promise<void> {
  return repo.update(id, data as Partial<HelpArticle>);
}

export async function deleteHelpArticle(id: string): Promise<void> {
  return repo.delete(id);
}

// ── Retrieval for the AI assistant ───────────────────────────
// Simple keyword/tag matching (no external search service) — scores each
// article by how many of the question's tokens appear in its title,
// keywords, category, or content, weighted so title/keyword/category hits
// count for more than a plain content mention.
// Unicode-aware so non-Latin scripts (e.g. Malayalam) tokenize correctly
// too, not just ASCII — matters once questions can arrive in other
// languages via the AI assistant's voice/language support.
function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

export async function searchHelpArticles(question: string, maxResults = 3): Promise<HelpArticle[]> {
  const queryTokens = new Set(tokenize(question));
  if (queryTokens.size === 0) return [];

  const articles = await fetchHelpArticles();

  const scored = articles.map((article) => {
    const titleTokens    = new Set(tokenize(article.title));
    const keywordTokens  = new Set(article.keywords.flatMap(tokenize));
    const categoryTokens = new Set(tokenize(article.category));
    const contentTokens  = new Set(tokenize(article.content));

    let score = 0;
    for (const t of queryTokens) {
      if (titleTokens.has(t))    score += 3;
      if (keywordTokens.has(t))  score += 3;
      if (categoryTokens.has(t)) score += 2;
      if (contentTokens.has(t))  score += 1;
    }
    return { article, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.article);
}
