"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Clock } from "lucide-react";
import { essRegularizationApplySchema, type EssRegularizationApplySchema } from "@/modules/ess/schemas";

type Props = {
  open: boolean;
  date: string | null;
  onClose: () => void;
  onSubmit: (data: EssRegularizationApplySchema) => Promise<{ error: string | null }>;
};

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

export function RequestCorrectionForm({ open, date, onClose, onSubmit }: Props) {
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<EssRegularizationApplySchema>({
    resolver: zodResolver(essRegularizationApplySchema),
    defaultValues: { date: date ?? "", requestedClockIn: "", requestedClockOut: "", reason: "" },
  });

  useEffect(() => {
    if (open) reset({ date: date ?? "", requestedClockIn: "", requestedClockOut: "", reason: "" });
  }, [open, date, reset]);

  if (!open) return null;

  async function submit(data: EssRegularizationApplySchema) {
    const { error } = await onSubmit(data);
    if (error) { setError("root", { message: error }); return; }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Clock size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Request Attendance Correction</h2>
              <p className="text-xs text-muted-foreground">Goes to your reporting manager or HR for approval</p>
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

          <Field label="Date *" error={errors.date?.message}><input className={inp} type="date" {...register("date")} /></Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Correct Check In"><input className={inp} type="time" {...register("requestedClockIn")} /></Field>
            <Field label="Correct Check Out"><input className={inp} type="time" {...register("requestedClockOut")} /></Field>
          </div>

          <Field label="Reason *" error={errors.reason?.message}>
            <textarea className={`${inp} resize-none`} rows={3} placeholder="Why does this day need correcting..." {...register("reason")} />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit(submit)} disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Submit Request
          </button>
        </div>

      </div>
    </div>
  );
}
