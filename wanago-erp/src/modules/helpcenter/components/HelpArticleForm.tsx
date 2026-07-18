"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, BookOpen } from "lucide-react";
import { helpArticleSchema, type HelpArticleSchema } from "@/modules/helpcenter/schemas";
import { cn } from "@/lib/utils/helpers";
import type { HelpArticle } from "@/modules/helpcenter/types";

type Props = {
  open:     boolean;
  article?: HelpArticle | null;
  onClose:  () => void;
  onSubmit: (data: HelpArticleSchema) => Promise<void>;
};

function Field({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "placeholder:text-muted-foreground/60",
  "hover:border-primary/40",
  "focus:border-primary focus:ring-0",
  "[&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function HelpArticleForm({ open, article, onClose, onSubmit }: Props) {
  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<HelpArticleSchema>({
    resolver: zodResolver(helpArticleSchema),
    defaultValues: { keywords: [], lastUpdated: todayIso() },
  });

  const keywordsValue = watch("keywords") ?? [];

  useEffect(() => {
    if (!open) return;
    if (article) {
      reset({
        title:       article.title,
        category:    article.category,
        content:     article.content,
        keywords:    article.keywords,
        lastUpdated: article.lastUpdated,
      });
    } else {
      reset({ title: "", category: "", content: "", keywords: [], lastUpdated: todayIso() });
    }
  }, [open, article, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-2xl max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {article ? "Edit Help Article" : "Add Help Article"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {article ? `Editing "${article.title}"` : "Used by the AI Assistant to answer staff questions"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">

          <Field label="Title" required error={errors.title?.message}>
            <input className={inputClass} placeholder="e.g. How to apply for leave" {...register("title")} />
          </Field>

          <Field label="Category / Module" required error={errors.category?.message}>
            <input className={inputClass} placeholder="e.g. HRMS, Leads, Invoices" {...register("category")} />
          </Field>

          <Field label="Content (Markdown supported)" required error={errors.content?.message}>
            <textarea
              rows={10}
              placeholder="Write the full article content here..."
              {...register("content")}
              className={cn(inputClass, "resize-none font-mono text-[13px]")}
            />
          </Field>

          <Field label="Keywords / Tags" error={errors.keywords?.message}>
            <input
              className={inputClass}
              placeholder="Comma-separated, e.g. leave, apply, casual, sick"
              defaultValue={keywordsValue.join(", ")}
              onBlur={(e) => {
                const list = e.target.value.split(",").map((k) => k.trim()).filter(Boolean);
                setValue("keywords", list);
              }}
            />
            <p className="text-[11px] text-muted-foreground">Separate multiple keywords with commas</p>
          </Field>

          <Field label="Last Updated" required error={errors.lastUpdated?.message}>
            <input className={inputClass} type="date" {...register("lastUpdated")} />
          </Field>

        </div>

        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {article ? "Changes will be saved immediately" : "Article will be added to the knowledge base"}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {article ? "Save Changes" : "Add Article"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
