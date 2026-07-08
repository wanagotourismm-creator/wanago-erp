"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Plus, Trash2, MapPin } from "lucide-react";
import { trainingStepSchema, type TrainingStepSchema } from "@/modules/onboarding-training/schemas";
import { cn } from "@/lib/utils/helpers";
import type { TrainingStep } from "@/modules/onboarding-training/types";

type Props = {
  open: boolean; step?: TrainingStep | null;
  onClose: () => void; onSubmit: (d: TrainingStepSchema) => Promise<void>;
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
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "placeholder:text-muted-foreground/50 hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

const DEFAULTS: TrainingStepSchema = {
  targetPath: "", targetSelector: "", explanationEn: "", explanationMl: "",
  hasQuiz: false, quizQuestionEn: "", quizQuestionMl: "",
  quizOptions: [{ en: "", ml: "" }, { en: "", ml: "" }], quizCorrectIndex: 0,
};

export function TrainingStepForm({ open, step, onClose, onSubmit }: Props) {
  const { register, handleSubmit, reset, control, watch, formState: { errors, isSubmitting } } = useForm<TrainingStepSchema>({
    resolver: zodResolver(trainingStepSchema),
    defaultValues: DEFAULTS,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "quizOptions" });
  const hasQuiz = watch("hasQuiz");
  const correctIndex = watch("quizCorrectIndex");

  useEffect(() => {
    if (!open) return;
    reset(step ? {
      targetPath: step.targetPath, targetSelector: step.targetSelector,
      explanationEn: step.explanationEn, explanationMl: step.explanationMl,
      hasQuiz: !!step.quiz,
      quizQuestionEn: step.quiz?.questionEn ?? "", quizQuestionMl: step.quiz?.questionMl ?? "",
      quizOptions: step.quiz?.options?.length ? step.quiz.options : DEFAULTS.quizOptions,
      quizCorrectIndex: step.quiz?.correctIndex ?? 0,
    } : DEFAULTS);
  }, [open, step, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative flex max-h-[88vh] w-full max-w-lg flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <MapPin size={15} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{step ? "Edit Step" : "New Step"}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={15} /></button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target Page" error={errors.targetPath?.message} required>
              <input className={inputClass} placeholder="/leads" {...register("targetPath")} />
            </Field>
            <Field label="Target Element" error={errors.targetSelector?.message} required>
              <input className={inputClass} placeholder="New Lead button" {...register("targetSelector")} />
            </Field>
          </div>

          <Field label="Explanation (English)" error={errors.explanationEn?.message} required>
            <textarea rows={2} className={cn(inputClass, "resize-none")} placeholder="What should the employee do here?" {...register("explanationEn")} />
          </Field>
          <Field label="Explanation (Malayalam)" error={errors.explanationMl?.message} required>
            <textarea rows={2} className={cn(inputClass, "resize-none")} placeholder="ഇവിടെ ജീവനക്കാരൻ എന്ത് ചെയ്യണം?" {...register("explanationMl")} />
          </Field>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" className="h-4 w-4 rounded border-input" {...register("hasQuiz")} />
            Add a quiz question to this step
          </label>

          {hasQuiz && (
            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
              <Field label="Question (English)" error={errors.quizQuestionEn?.message} required>
                <input className={inputClass} {...register("quizQuestionEn")} />
              </Field>
              <Field label="Question (Malayalam)" error={errors.quizQuestionMl?.message} required>
                <input className={inputClass} {...register("quizQuestionMl")} />
              </Field>

              <div className="space-y-2">
                <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Answer Options <span className="text-destructive">*</span>
                </label>
                {errors.quizOptions && <p className="text-xs font-medium text-destructive">{errors.quizOptions.message}</p>}
                {errors.quizCorrectIndex && <p className="text-xs font-medium text-destructive">{errors.quizCorrectIndex.message}</p>}
                {fields.map((f, i) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <input type="radio" value={i} checked={correctIndex === i}
                      className="h-4 w-4 flex-shrink-0"
                      {...register("quizCorrectIndex", { valueAsNumber: true })} />
                    <input className={cn(inputClass, "flex-1")} placeholder={`Option ${i + 1} (English)`} {...register(`quizOptions.${i}.en`)} />
                    <input className={cn(inputClass, "flex-1")} placeholder={`Option ${i + 1} (Malayalam)`} {...register(`quizOptions.${i}.ml`)} />
                    {fields.length > 2 && (
                      <button type="button" onClick={() => remove(i)} className="flex-shrink-0 text-muted-foreground hover:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => append({ en: "", ml: "" })}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80">
                  <Plus size={12} /> Add option
                </button>
                <p className="text-[11px] text-muted-foreground">Select the radio button next to the correct answer.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/30 px-5 py-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors">
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {step ? "Save" : "Add Step"}
          </button>
        </div>
      </div>
    </div>
  );
}
