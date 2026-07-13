"use client";

import { useState } from "react";
import { Star, Loader2, CheckCircle2, Upload } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import type { FormField } from "@/modules/forms/types";

export type FormAnswers = Record<string, string | string[] | number | null>;

type Props = {
  fields:       FormField[];
  onSubmit:     (answers: FormAnswers) => Promise<{ error: string | null } | void>;
  onUploadFile?: (file: File) => Promise<string>;
  submitLabel?: string;
  dark?:        boolean; // used on the public page, sitting on a dark gradient hero
};

const inputClassLight = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "placeholder:text-muted-foreground/60 hover:border-primary/40",
  "focus:border-primary focus:ring-2 focus:ring-primary/20"
);

export function FormRenderer({ fields, onSubmit, onUploadFile, submitLabel = "Submit", dark = false }: Props) {
  const [answers, setAnswers] = useState<FormAnswers>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const inputClass = dark
    ? "w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 text-sm text-white outline-none transition-all placeholder:text-white/50 focus:border-white/50 focus:ring-2 focus:ring-white/20"
    : inputClassLight;
  const labelClass = dark ? "text-white/85" : "text-foreground";

  function setAnswer(fieldId: string, value: string | string[] | number | null) {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
    setErrors(prev => { const next = { ...prev }; delete next[fieldId]; return next; });
  }

  async function handleFileChange(field: FormField, file: File | undefined) {
    if (!file || !onUploadFile) return;
    setUploading(field.id);
    try {
      const url = await onUploadFile(file);
      setAnswer(field.id, url);
    } catch {
      setErrors(prev => ({ ...prev, [field.id]: "Upload failed — try again" }));
    } finally {
      setUploading(null);
    }
  }

  function toggleCheckbox(field: FormField, option: string) {
    const current = (answers[field.id] as string[] | undefined) ?? [];
    setAnswer(field.id, current.includes(option) ? current.filter(o => o !== option) : [...current, option]);
  }

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    for (const field of fields) {
      if (!field.required) continue;
      const v = answers[field.id];
      const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
      if (empty) nextErrors[field.id] = "This question is required";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await onSubmit(answers);
      if (result?.error) { setSubmitError(result.error); return; }
      setDone(true);
    } catch {
      setSubmitError("Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 size={26} className="text-green-600" />
        </div>
        <p className={cn("text-base font-semibold", labelClass)}>Thanks — your response has been recorded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <label className={cn("flex items-center gap-1 text-sm font-medium", labelClass)}>
            {field.label} {field.required && <span className="text-destructive">*</span>}
          </label>

          {field.type === "short_text" && (
            <input className={inputClass} placeholder={field.placeholder ?? ""} value={(answers[field.id] as string) ?? ""} onChange={(e) => setAnswer(field.id, e.target.value)} />
          )}
          {field.type === "long_text" && (
            <textarea rows={3} className={cn(inputClass, "resize-none")} placeholder={field.placeholder ?? ""} value={(answers[field.id] as string) ?? ""} onChange={(e) => setAnswer(field.id, e.target.value)} />
          )}
          {field.type === "number" && (
            <input type="number" className={inputClass} placeholder={field.placeholder ?? ""} value={(answers[field.id] as number) ?? ""} onChange={(e) => setAnswer(field.id, e.target.value === "" ? null : Number(e.target.value))} />
          )}
          {field.type === "date" && (
            <input type="date" className={inputClass} value={(answers[field.id] as string) ?? ""} onChange={(e) => setAnswer(field.id, e.target.value)} />
          )}
          {field.type === "dropdown" && (
            <select className={inputClass} value={(answers[field.id] as string) ?? ""} onChange={(e) => setAnswer(field.id, e.target.value)}>
              <option value="">Select...</option>
              {field.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          {field.type === "multiple_choice" && (
            <div className="space-y-1.5">
              {field.options.map(o => (
                <label key={o} className={cn("flex items-center gap-2 text-sm cursor-pointer", labelClass)}>
                  <input type="radio" name={field.id} checked={answers[field.id] === o} onChange={() => setAnswer(field.id, o)} className="h-4 w-4" />
                  {o}
                </label>
              ))}
            </div>
          )}
          {field.type === "checkboxes" && (
            <div className="space-y-1.5">
              {field.options.map(o => (
                <label key={o} className={cn("flex items-center gap-2 text-sm cursor-pointer", labelClass)}>
                  <input type="checkbox" checked={((answers[field.id] as string[]) ?? []).includes(o)} onChange={() => toggleCheckbox(field, o)} className="h-4 w-4 rounded" />
                  {o}
                </label>
              ))}
            </div>
          )}
          {field.type === "rating" && (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setAnswer(field.id, n)} className="p-0.5">
                  <Star size={22} className={(answers[field.id] as number ?? 0) >= n ? "fill-amber-400 text-amber-400" : cn("text-muted-foreground", dark && "text-white/30")} />
                </button>
              ))}
            </div>
          )}
          {field.type === "file" && (
            <div>
              <label className={cn("inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors", dark ? "border-white/25 text-white hover:bg-white/10" : "border-border text-foreground hover:border-primary/40 hover:bg-muted")}>
                {uploading === field.id ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {uploading === field.id ? "Uploading..." : answers[field.id] ? "File uploaded — replace" : "Choose file"}
                <input type="file" className="hidden" disabled={uploading === field.id} onChange={(e) => handleFileChange(field, e.target.files?.[0])} />
              </label>
            </div>
          )}

          {errors[field.id] && <p className="text-xs font-medium text-destructive">{errors[field.id]}</p>}
        </div>
      ))}

      {submitError && <p className="text-xs font-medium text-destructive">{submitError}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {submitting && <Loader2 size={14} className="animate-spin" />}
        {submitLabel}
      </button>
    </div>
  );
}
