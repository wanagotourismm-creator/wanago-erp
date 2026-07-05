"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchHelpArticles, createHelpArticle, updateHelpArticle, deleteHelpArticle,
} from "@/modules/helpcenter/services/help-article.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { HelpArticle } from "@/modules/helpcenter/types";
import type { HelpArticleSchema } from "@/modules/helpcenter/schemas";

export function useHelpArticles() {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading,  setLoading]  = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setArticles(await fetchHelpArticles());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addArticle(data: HelpArticleSchema): Promise<void> {
    const article = await createHelpArticle(data, user?.uid ?? "");
    setArticles((prev) => [...prev, article].sort((a, b) => a.title.localeCompare(b.title)));
    logActivity({
      entityType: "Help Article", entityName: article.title, action: "created",
      detail: `Added help article "${article.title}"`,
      actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
    });
  }

  async function editArticle(id: string, data: Partial<HelpArticleSchema>): Promise<void> {
    await updateHelpArticle(id, data);
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
    const article = articles.find((a) => a.id === id);
    if (article) {
      logActivity({
        entityType: "Help Article", entityName: article.title, action: "updated",
        detail: `Updated help article "${article.title}"`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
    }
  }

  // Creates many articles in one pass (used by the bulk-import tool) —
  // reloads once at the end instead of updating state per-item, and logs
  // a single summary activity entry rather than one per article.
  async function bulkAddArticles(items: HelpArticleSchema[]): Promise<{ created: number; failed: number }> {
    let created = 0;
    let failed = 0;
    for (const item of items) {
      try {
        await createHelpArticle(item, user?.uid ?? "");
        created += 1;
      } catch {
        failed += 1;
      }
    }
    await load();
    if (created > 0) {
      logActivity({
        entityType: "Help Article", entityName: `${created} articles`, action: "created",
        detail: `Bulk-imported ${created} help article(s)`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
    }
    return { created, failed };
  }

  async function removeArticle(id: string): Promise<void> {
    const article = articles.find((a) => a.id === id);
    await deleteHelpArticle(id);
    setArticles((prev) => prev.filter((a) => a.id !== id));
    if (article) {
      logActivity({
        entityType: "Help Article", entityName: article.title, action: "deleted",
        detail: `Deleted help article "${article.title}"`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
    }
  }

  return { articles, loading, load, addArticle, editArticle, removeArticle, bulkAddArticles };
}
