"use client";

import { Edit2, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/utils/helpers";
import type { HelpArticle } from "@/modules/helpcenter/types";

type Props = {
  articles: HelpArticle[];
  loading:  boolean;
  onView:   (article: HelpArticle) => void;
  onEdit:   (article: HelpArticle) => void;
  onDelete: (article: HelpArticle) => void;
};

export function HelpArticlesTable({ articles, loading, onView, onEdit, onDelete }: Props) {
  if (loading) return <SkeletonTable rows={6} />;

  if (articles.length === 0) {
    return (
      <EmptyState
        title="No help articles yet"
        description="Add articles so the AI Assistant can answer staff questions about using the software"
        icon={<span className="text-2xl">📚</span>}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Title", "Category", "Keywords", "Last Updated", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {articles.map((article) => (
              <tr
                key={article.id}
                onClick={() => onView(article)}
                className="cursor-pointer hover:bg-muted/20 transition-colors group"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{article.title}</p>
                </td>

                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {article.category}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {article.keywords.slice(0, 4).map((k) => (
                      <span key={k} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{k}</span>
                    ))}
                    {article.keywords.length > 4 && (
                      <span className="text-[11px] text-muted-foreground">+{article.keywords.length - 4}</span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(article.lastUpdated)}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(article); }}
                      title="Edit"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(article); }}
                      title="Delete"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
