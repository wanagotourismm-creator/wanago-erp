"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, LifeBuoy, Film, Image as ImageIcon } from "lucide-react";
import { essTicketReportSchema, type EssTicketReportSchema } from "@/modules/tickets/schemas";
import { TICKET_CATEGORIES } from "@/modules/tickets/types";
import { Modal } from "@/components/ui/Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: EssTicketReportSchema, files: File[]) => Promise<{ error: string | null }>;
};

const MAX_ATTACHMENTS = 4;

const inp = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ReportIssueForm({ open, onClose, onSubmit }: Props) {
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<EssTicketReportSchema>({
    resolver: zodResolver(essTicketReportSchema),
    defaultValues: { title: "", description: "", category: "", priority: "medium" },
  });
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (open) { reset({ title: "", description: "", category: "", priority: "medium" }); setFiles([]); }
  }, [open, reset]);

  if (!open) return null;

  function addFiles(picked: FileList | null) {
    if (!picked) return;
    setFiles((prev) => [...prev, ...Array.from(picked)].slice(0, MAX_ATTACHMENTS));
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit(data: EssTicketReportSchema) {
    const { error } = await onSubmit(data, files);
    if (error) { setError("root", { message: error }); return; }
    onClose();
  }

  return (
    <Modal onClose={onClose} size="md">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <LifeBuoy size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Report an Issue</h2>
              <p className="text-xs text-muted-foreground">Goes to IT/Admin for resolution</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {errors.root?.message && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{errors.root.message}</div>
          )}

          <Field label="Title *" error={errors.title?.message}>
            <input className={inp} placeholder="Short summary of the issue" {...register("title")} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Category *" error={errors.category?.message}>
              <select className={inp} {...register("category")}>
                <option value="">Select category</option>
                {TICKET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Priority *">
              <select className={inp} {...register("priority")}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </Field>
          </div>

          <Field label="Description *" error={errors.description?.message}>
            <textarea className={`${inp} resize-none`} rows={4} placeholder="What happened, what did you expect, any error messages..." {...register("description")} />
          </Field>

          <Field label={`Attach a screenshot or screen recording (optional, up to ${MAX_ATTACHMENTS})`}>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                disabled={files.length >= MAX_ATTACHMENTS}
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-xl file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/20 disabled:opacity-50"
              />
              <p className="text-[11px] text-muted-foreground">
                For a &ldquo;Software&rdquo; issue, a screenshot or short screen recording of the bug helps the AI Employee pinpoint the exact cause.
              </p>
              {files.length > 0 && (
                <ul className="space-y-1.5">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
                      {f.type.startsWith("video/") ? <Film size={13} className="flex-shrink-0 text-primary" /> : <ImageIcon size={13} className="flex-shrink-0 text-primary" />}
                      <span className="min-w-0 flex-1 truncate text-xs text-foreground">{f.name}</span>
                      <button type="button" onClick={() => removeFile(i)} className="flex-shrink-0 text-muted-foreground hover:text-destructive">
                        <X size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit(submit)} disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Submit
          </button>
        </div>

    </Modal>
  );
}
