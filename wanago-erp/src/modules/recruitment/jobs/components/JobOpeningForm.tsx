"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Briefcase, Sparkles } from "lucide-react";
import { jobOpeningSchema, type JobOpeningSchema } from "@/modules/recruitment/jobs/schemas";
import { EMPLOYMENT_TYPE_LABELS, DEPARTMENTS } from "@/modules/hrms/employees/components/EmployeeBadges";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import { draftJobDescription } from "@/modules/recruitment/jobs/services/job-ai.service";
import type { JobOpening } from "@/modules/recruitment/jobs/types";

type Props = {
  open: boolean;
  job?: JobOpening | null;
  onClose: () => void;
  onSubmit: (data: JobOpeningSchema) => Promise<void>;
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

const today = new Date().toISOString().slice(0, 10);

export function JobOpeningForm({ open, job, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<JobOpeningSchema>({
    resolver: zodResolver(jobOpeningSchema),
    defaultValues: {
      employmentType: "full_time", openings: 1, postedDate: today,
      officeId:   user?.officeId   ?? "main",
      officeName: user?.officeName ?? "Head Office",
    },
  });

  useEffect(() => {
    if (open) {
      if (job) {
        reset({ ...job, description: job.description ?? "", requirements: job.requirements ?? "", closingDate: job.closingDate ?? "" });
      } else {
        reset({
          employmentType: "full_time", openings: 1, postedDate: today,
          officeId:   user?.officeId   ?? "main",
          officeName: user?.officeName ?? "Head Office",
        });
      }
    }
  }, [open, job, reset, user]);

  const title = watch("title");
  const department = watch("department");
  const location = watch("location");
  const employmentType = watch("employmentType");

  async function handleDraftWithAi() {
    if (!title) {
      setAiError("Enter a job title first.");
      return;
    }
    setAiDrafting(true);
    setAiError(null);
    const result = await draftJobDescription({ title, department, location, employmentType });
    if ("error" in result) setAiError(result.error);
    else {
      setValue("description", result.draft.description);
      setValue("requirements", result.draft.requirements);
    }
    setAiDrafting(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Briefcase size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{job ? "Edit Job Opening" : "Post Job Opening"}</h2>
              <p className="text-xs text-muted-foreground">{job ? `Editing ${job.refNumber}` : "Fill in the role details"}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="col-span-2">
              <Field label="Job Title" required error={errors.title?.message}>
                <input className={inputClass} placeholder="e.g. Sales Executive" {...register("title")} />
              </Field>
            </div>
            <Field label="Department" required error={errors.department?.message}>
              <select className={inputClass} {...register("department")}>
                <option value="">Select department</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Location" required error={errors.location?.message}>
              <input className={inputClass} placeholder="e.g. Kozhikode" {...register("location")} />
            </Field>
            <Field label="Employment Type" required>
              <select className={inputClass} {...register("employmentType")}>
                {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="No. of Openings" required error={errors.openings?.message}>
              <input className={inputClass} type="number" min={1} {...register("openings")} />
            </Field>
            <Field label="Posted Date" required error={errors.postedDate?.message}>
              <input className={inputClass} type="date" {...register("postedDate")} />
            </Field>
            <Field label="Closing Date">
              <input className={inputClass} type="date" {...register("closingDate")} />
            </Field>
            <div className="col-span-2">
              <button
                type="button"
                onClick={handleDraftWithAi}
                disabled={aiDrafting}
                className="mb-2 inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-60 transition-colors"
              >
                {aiDrafting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                Draft with AI
              </button>
              {aiError && <p className="mb-2 text-xs text-destructive font-medium">{aiError}</p>}
            </div>
            <div className="col-span-2">
              <Field label="Description">
                <textarea rows={3} className={cn(inputClass, "resize-none")} placeholder="Role summary..." {...register("description")} />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Requirements">
                <textarea rows={3} className={cn(inputClass, "resize-none")} placeholder="Skills, experience, qualifications..." {...register("requirements")} />
              </Field>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {job ? "Save Changes" : "Post Job"}
          </button>
        </div>

      </div>
    </div>
  );
}
