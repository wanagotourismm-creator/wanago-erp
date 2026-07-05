"use client";

import { useState } from "react";
import { X, Loader2, UploadCloud, CheckCircle2, AlertTriangle } from "lucide-react";
import { helpArticleSchema, type HelpArticleSchema } from "@/modules/helpcenter/schemas";
import { cn } from "@/lib/utils/helpers";

type Props = {
  open:     boolean;
  onClose:  () => void;
  onImport: (items: HelpArticleSchema[]) => Promise<{ created: number; failed: number }>;
};

const PLACEHOLDER = `[
  {
    "title": "How to Apply for Leave",
    "category": "HRMS",
    "content": "1. Go to My HR...\\n2. ...",
    "keywords": ["leave", "apply leave"],
    "lastUpdated": "2026-07-06"
  }
]`;

export function HelpArticleBulkImport({ open, onClose, onImport }: Props) {
  const [raw, setRaw] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; failed: number; invalid: number } | null>(null);

  if (!open) return null;

  function handleClose() {
    setRaw("");
    setParseError(null);
    setResult(null);
    onClose();
  }

  async function handleImport() {
    setParseError(null);
    setResult(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setParseError("That isn't valid JSON — check for missing commas or brackets.");
      return;
    }

    if (!Array.isArray(parsed)) {
      setParseError("Expected a JSON array of articles, e.g. [ { ... }, { ... } ]");
      return;
    }

    const valid: HelpArticleSchema[] = [];
    let invalid = 0;
    for (const item of parsed) {
      const check = helpArticleSchema.safeParse(item);
      if (check.success) valid.push(check.data);
      else invalid += 1;
    }

    if (valid.length === 0) {
      setParseError("None of the entries matched the expected article shape (title, category, content, keywords, lastUpdated).");
      return;
    }

    setImporting(true);
    const { created, failed } = await onImport(valid);
    setImporting(false);
    setResult({ created, failed, invalid });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="modal-enter relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <UploadCloud size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Bulk Import Articles</h2>
              <p className="text-xs text-muted-foreground">Paste a JSON array of articles to create them all at once</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin">
          <textarea
            rows={16}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={PLACEHOLDER}
            className={cn(
              "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-[12px] font-mono outline-none transition-all resize-none",
              "placeholder:text-muted-foreground/50",
              "focus:border-primary focus:ring-0 [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
            )}
          />

          {parseError && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {result && (
            <div className="flex items-start gap-2 rounded-xl border border-green-500/30 bg-green-50 dark:bg-green-900/20 px-3 py-2.5 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                Created {result.created} article{result.created !== 1 ? "s" : ""}.
                {result.failed > 0 && ` ${result.failed} failed to save.`}
                {result.invalid > 0 && ` ${result.invalid} entr${result.invalid !== 1 ? "ies" : "y"} skipped (didn't match the expected shape).`}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">Each entry needs: title, category, content, keywords (array), lastUpdated</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleImport}
              disabled={importing || !raw.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
            >
              {importing && <Loader2 size={14} className="animate-spin" />}
              Import
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
