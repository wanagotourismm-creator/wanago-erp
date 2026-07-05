"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Star } from "lucide-react";
import { performanceReviewSchema, type PerformanceReviewSchema } from "@/modules/performance/reviews/schemas";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { RATING_LABELS } from "@/lib/constants";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import type { Employee } from "@/modules/hrms/shared/types";
import type { PerformanceReview } from "@/modules/performance/reviews/types";

type Props = {
  open: boolean;
  review?: PerformanceReview | null;
  onClose: () => void;
  onSubmit: (data: PerformanceReviewSchema) => Promise<void>;
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

export function ReviewForm({ open, review, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<PerformanceReviewSchema>({
    resolver: zodResolver(performanceReviewSchema),
    defaultValues: {
      reviewType: "quarterly", reviewDate: today,
      reviewerId:   user?.uid ?? "",
      reviewerName: user?.displayName ?? "",
      officeId:     user?.officeId   ?? "main",
      officeName:   user?.officeName ?? "Head Office",
    },
  });

  useEffect(() => {
    if (!open) return;
    fetchEmployees().then(setEmployees).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (open) {
      if (review) {
        reset({ ...review, strengths: review.strengths ?? "", areasForImprovement: review.areasForImprovement ?? "", comments: review.comments ?? "" });
      } else {
        reset({
          reviewType: "quarterly", reviewDate: today,
          reviewerId:   user?.uid ?? "",
          reviewerName: user?.displayName ?? "",
          officeId:     user?.officeId   ?? "main",
          officeName:   user?.officeName ?? "Head Office",
        });
      }
    }
  }, [open, review, reset, user]);

  const selectedEmployeeId = watch("employeeId");
  const selectedRating = watch("rating");

  function handleEmployeeChange(id: string) {
    const emp = employees.find(e => e.id === id);
    setValue("employeeId", id);
    setValue("employeeName", emp?.fullName ?? "");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Star size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{review ? "Edit Review" : "New Performance Review"}</h2>
              <p className="text-xs text-muted-foreground">{review ? `Editing ${review.refNumber}` : "Record a quarterly/annual review"}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          <Field label="Employee" required error={errors.employeeId?.message}>
            <select className={inputClass} value={selectedEmployeeId ?? ""} onChange={e => handleEmployeeChange(e.target.value)} disabled={!!review}>
              <option value="">Select employee</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.fullName} — {e.designation}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Review Type" required>
              <select className={inputClass} {...register("reviewType")}>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </Field>
            <Field label="Period" required error={errors.period?.message}>
              <input className={inputClass} placeholder="e.g. Q1 2026" {...register("period")} />
            </Field>
            <Field label="Review Date" required error={errors.reviewDate?.message}>
              <input className={inputClass} type="date" {...register("reviewDate")} />
            </Field>
            <Field label="Reviewer">
              <input className={inputClass} {...register("reviewerName")} readOnly />
            </Field>
          </div>

          <Field label="Rating" required error={errors.rating?.message}>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(RATING_LABELS).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setValue("rating", k as PerformanceReviewSchema["rating"])}
                  className={cn(
                    "rounded-xl border-2 py-2 text-xs font-semibold transition-all",
                    selectedRating === k
                      ? "border-primary bg-primary/10 text-primary scale-[1.02]"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Strengths">
            <textarea rows={2} className={cn(inputClass, "resize-none")} placeholder="What went well..." {...register("strengths")} />
          </Field>
          <Field label="Areas for Improvement">
            <textarea rows={2} className={cn(inputClass, "resize-none")} placeholder="What could be better..." {...register("areasForImprovement")} />
          </Field>
          <Field label="Additional Comments">
            <textarea rows={2} className={cn(inputClass, "resize-none")} placeholder="Any other notes..." {...register("comments")} />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {review ? "Save Changes" : "Submit Review"}
          </button>
        </div>

      </div>
    </div>
  );
}
