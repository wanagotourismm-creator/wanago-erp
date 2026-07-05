"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Target } from "lucide-react";
import { companyGoalSchema, type CompanyGoalSchema } from "@/modules/goals/schemas";
import type { CompanyGoal } from "@/modules/goals/types";

type Props = {
  open: boolean;
  goal?: CompanyGoal | null;
  onClose: () => void;
  onSubmit: (data: CompanyGoalSchema) => Promise<void>;
};

const inp = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function GoalForm({ open, goal, onClose, onSubmit }: Props) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CompanyGoalSchema>({
    resolver: zodResolver(companyGoalSchema),
    defaultValues: { goalStatus: "active" },
  });

  useEffect(() => {
    if (!open) return;
    if (goal) reset({ title: goal.title, description: goal.description, startDate: goal.startDate, endDate: goal.endDate, goalStatus: goal.goalStatus });
    else reset({ goalStatus: "active" });
  }, [open, goal, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Target size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{goal ? "Edit Goal" : "New Company Goal"}</h2>
              <p className="text-xs text-muted-foreground">A phase-level target with objectives underneath</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          <Field label="Title *" error={errors.title?.message}>
            <input className={inp} placeholder="e.g. Phase 2 — Amplify" {...register("title")} />
          </Field>
          <Field label="Description *" error={errors.description?.message}>
            <textarea className={`${inp} resize-none`} rows={2} placeholder="e.g. Acquisition and Acceleration 650-700/Day" {...register("description")} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Start Date *" error={errors.startDate?.message}><input className={inp} type="date" {...register("startDate")} /></Field>
            <Field label="End Date *" error={errors.endDate?.message}><input className={inp} type="date" {...register("endDate")} /></Field>
          </div>
          <Field label="Status *">
            <select className={inp} {...register("goalStatus")}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {goal ? "Save Changes" : "Create Goal"}
          </button>
        </div>

      </div>
    </div>
  );
}
