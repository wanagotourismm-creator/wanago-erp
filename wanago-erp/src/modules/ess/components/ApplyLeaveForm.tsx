"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, CalendarDays } from "lucide-react";
import { essLeaveApplySchema, type EssLeaveApplySchema } from "@/modules/ess/schemas";
import { LEAVE_TYPE_LABELS, type LeaveTypeKey } from "@/modules/leavepolicy/services/leave-policy.service";

type Props = {
  open: boolean;
  enabledLeaveTypes: LeaveTypeKey[];
  onClose: () => void;
  onSubmit: (data: EssLeaveApplySchema) => Promise<{ error: string | null }>;
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

export function ApplyLeaveForm({ open, enabledLeaveTypes, onClose, onSubmit }: Props) {
  const defaultType = enabledLeaveTypes[0] ?? "casual";
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<EssLeaveApplySchema>({
    resolver: zodResolver(essLeaveApplySchema),
    defaultValues: { leaveType: defaultType, fromDate: "", toDate: "", reason: "" },
  });

  useEffect(() => {
    if (open) reset({ leaveType: defaultType, fromDate: "", toDate: "", reason: "" });
  }, [open, defaultType, reset]);

  if (!open) return null;

  if (enabledLeaveTypes.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="modal-enter relative w-full max-w-sm rounded-2xl border border-primary/20 bg-card p-6 shadow-2xl text-center">
          <p className="text-sm font-semibold text-foreground mb-1">No leave types available</p>
          <p className="text-xs text-muted-foreground mb-4">HR hasn&apos;t enabled any leave types yet. Contact HR or check back later.</p>
          <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">Close</button>
        </div>
      </div>
    );
  }

  async function submit(data: EssLeaveApplySchema) {
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
              <CalendarDays size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Apply for Leave</h2>
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

          <Field label="Leave Type *" error={errors.leaveType?.message}>
            <select className={inp} {...register("leaveType")}>
              {enabledLeaveTypes.map((t) => <option key={t} value={t}>{LEAVE_TYPE_LABELS[t]}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="From Date *" error={errors.fromDate?.message}><input className={inp} type="date" {...register("fromDate")} /></Field>
            <Field label="To Date *" error={errors.toDate?.message}><input className={inp} type="date" {...register("toDate")} /></Field>
          </div>

          <Field label="Reason *" error={errors.reason?.message}>
            <textarea className={`${inp} resize-none`} rows={3} placeholder="Reason for leave..." {...register("reason")} />
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
