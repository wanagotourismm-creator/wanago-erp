"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, GraduationCap } from "lucide-react";
import { trainingModuleSchema, type TrainingModuleSchema } from "@/modules/onboarding-training/schemas";
import type { TrainingModule } from "@/modules/onboarding-training/types";

type Props = {
  open: boolean; module?: TrainingModule | null;
  onClose: () => void; onSubmit: (d: TrainingModuleSchema) => Promise<void>;
};

const inp = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]";

export function TrainingModuleForm({ open, module, onClose, onSubmit }: Props) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TrainingModuleSchema>({
    resolver: zodResolver(trainingModuleSchema),
    defaultValues: { title: "", description: "", mandatory: false },
  });

  useEffect(() => {
    if (open) reset({ title: module?.title ?? "", description: module?.description ?? "", mandatory: module?.mandatory ?? false });
  }, [open, module, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-sm rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <GraduationCap size={15} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{module ? "Edit Training Module" : "New Training Module"}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={15} /></button>
        </div>

        <div className="p-5 space-y-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Title *</label>
            <input className={inp} placeholder="e.g. How to Add a Lead" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
            <input className={inp} placeholder="What does this module cover?" {...register("description")} />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" className="h-4 w-4 rounded border-input" {...register("mandatory")} />
            Mandatory
          </label>
          <p className="text-[11px] text-muted-foreground">
            Tracked for reporting only right now — this doesn&apos;t restrict access to any ERP section yet.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/30 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors">
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {module ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
