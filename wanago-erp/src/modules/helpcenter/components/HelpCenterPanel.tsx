"use client";

import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { useHelpArticles } from "@/modules/helpcenter/hooks/useHelpArticles";
import { HelpArticleForm } from "@/modules/helpcenter/components/HelpArticleForm";
import { HelpArticlesTable } from "@/modules/helpcenter/components/HelpArticlesTable";
import { HelpArticleDetailModal } from "@/modules/helpcenter/components/HelpArticleDetailModal";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import type { HelpArticle } from "@/modules/helpcenter/types";

export function HelpCenterPanel() {
  const { articles, loading, load, addArticle, editArticle, removeArticle } = useHelpArticles();
  const [formOpen, setFormOpen] = useState(false);
  const [editing,  setEditing]  = useState<HelpArticle | null>(null);
  const [viewing,  setViewing]  = useState<HelpArticle | null>(null);

  function handleEdit(article: HelpArticle) {
    setViewing(null);
    setEditing(article);
    setFormOpen(true);
  }

  function handleDelete(article: HelpArticle) {
    if (!confirm(`Delete help article "${article.title}"? This cannot be undone.`)) return;
    setViewing(null);
    removeArticle(article.id);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Help Center"
        description={`${articles.length} article${articles.length !== 1 ? "s" : ""} · powers the AI Assistant's answers`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>Refresh</Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditing(null); setFormOpen(true); }}>Add Article</Button>
          </>
        }
      />

      <HelpArticlesTable
        articles={articles}
        loading={loading}
        onView={setViewing}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <HelpArticleDetailModal
        article={viewing ? articles.find(a => a.id === viewing.id) ?? viewing : null}
        onClose={() => setViewing(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <HelpArticleForm
        open={formOpen}
        article={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={async (data) => {
          if (editing) await editArticle(editing.id, data);
          else await addArticle(data);
          setFormOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
