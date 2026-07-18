"use client";

import { X, Edit2, Trash2, BookOpen } from "lucide-react";
import { formatDate } from "@/lib/utils/helpers";
import type { HelpArticle } from "@/modules/helpcenter/types";

type Props = {
  article:  HelpArticle | null;
  onClose:  () => void;
  onEdit:   (article: HelpArticle) => void;
  onDelete: (article: HelpArticle) => void;
};

export function HelpArticleDetailModal({ article, onClose, onEdit, onDelete }: Props) {
  if (!article) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BookOpen size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{article.title}</h2>
              <p className="text-xs text-muted-foreground">Last updated {formatDate(article.lastUpdated)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {article.category}
            </span>
            {article.keywords.map((k) => (
              <span key={k} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">{k}</span>
            ))}
          </div>

          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Content</p>
            <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
              {article.content}
            </p>
          </div>

        </div>

        <div className="flex items-center gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button
            onClick={() => onEdit(article)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
          >
            <Edit2 size={13} /> Edit
          </button>
          <button
            onClick={() => onDelete(article)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>

      </div>
    </div>
  );
}
