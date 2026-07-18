"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, GraduationCap, Upload, FileText, Trash2 } from "lucide-react";
import { trainingProgramSchema, type TrainingProgramSchema } from "@/modules/training/programs/schemas";
import { TRAINING_MODE_LABELS } from "@/lib/constants";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import type { TrainingProgram } from "@/modules/training/programs/types";

const CATEGORIES = ["Onboarding", "Compliance", "Technical", "Soft Skills", "Sales", "Leadership", "Other"];

type Props = {
  open:     boolean;
  program?: TrainingProgram | null;
  onClose:  () => void;
  onSubmit: (data: TrainingProgramSchema) => Promise<void>;
  onUploadMaterial: (label: string, file: File) => Promise<void>;
  onDeleteMaterial: (materialId: string) => Promise<void>;
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

const MATERIAL_LABELS = ["Presentation", "Handbook", "Video", "Reading Material", "Other"];

export function TrainingProgramForm({ open, program, onClose, onSubmit, onUploadMaterial, onDeleteMaterial }: Props) {
  const { user } = useAuthStore();
  const [materialLabel, setMaterialLabel] = useState(MATERIAL_LABELS[0]);
  const [uploading, setUploading] = useState(false);

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<TrainingProgramSchema>({
    resolver: zodResolver(trainingProgramSchema),
    defaultValues: {
      mode: "online",
      officeId:   user?.officeId   ?? "main",
      officeName: user?.officeName ?? "Head Office",
    },
  });

  useEffect(() => {
    if (open) {
      if (program) {
        reset({ ...program, description: program.description ?? "", endDate: program.endDate ?? "" });
      } else {
        reset({ mode: "online", officeId: user?.officeId ?? "main", officeName: user?.officeName ?? "Head Office" });
      }
    }
  }, [open, program, reset, user]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      await onUploadMaterial(materialLabel, file);
    } finally {
      setUploading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-xl max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <GraduationCap size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{program ? "Edit Training Program" : "New Training Program"}</h2>
              <p className="text-xs text-muted-foreground">{program ? `Editing ${program.refNumber}` : "Fill in the program details"}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="col-span-2">
              <Field label="Title" required error={errors.title?.message}>
                <input className={inputClass} placeholder="e.g. Customer Service Excellence" {...register("title")} />
              </Field>
            </div>
            <Field label="Category" required error={errors.category?.message}>
              <select className={inputClass} {...register("category")}>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Trainer" required error={errors.trainerName?.message}>
              <input className={inputClass} placeholder="e.g. Priya Nair" {...register("trainerName")} />
            </Field>
            <Field label="Mode" required>
              <select className={inputClass} {...register("mode")}>
                {Object.entries(TRAINING_MODE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Start Date" required error={errors.startDate?.message}>
              <input className={inputClass} type="date" {...register("startDate")} />
            </Field>
            <Field label="End Date">
              <input className={inputClass} type="date" {...register("endDate")} />
            </Field>
            <div className="col-span-2">
              <Field label="Description">
                <textarea rows={3} className={cn(inputClass, "resize-none")} placeholder="Program overview..." {...register("description")} />
              </Field>
            </div>
          </div>

          {program && (
            <>
              <div className="border-t border-border" />
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Learning Materials</p>
                <div className="flex items-center gap-2 mb-3">
                  <select value={materialLabel} onChange={e => setMaterialLabel(e.target.value)}
                    className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none hover:border-primary/40 focus:border-primary">
                    {MATERIAL_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
                    {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    Upload
                    <input type="file" className="hidden" disabled={uploading}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                  </label>
                </div>
                {program.materials.length === 0 ? (
                  <p className="py-3 text-center text-xs text-muted-foreground">No materials uploaded yet</p>
                ) : (
                  <div className="space-y-2">
                    {program.materials.map(m => (
                      <div key={m.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                        <a href={m.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-foreground hover:text-primary transition-colors">
                          <FileText size={13} className="text-muted-foreground" /> {m.label}
                        </a>
                        <button
                          onClick={() => { if (confirm(`Delete material "${m.label}"? This can't be undone.`)) onDeleteMaterial(m.id); }}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {program ? "Changes will be saved immediately" : "Materials can be added after creating the program"}
          </p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {program ? "Save Changes" : "Create Program"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
