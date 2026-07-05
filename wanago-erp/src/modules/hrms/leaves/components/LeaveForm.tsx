"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, CalendarDays } from "lucide-react";
import { leaveRequestSchema, type LeaveRequestSchema } from "@/modules/hrms/leaves/schemas";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { useAuthStore } from "@/store/auth.store";
import type { Employee, LeaveRequest } from "@/modules/hrms/shared/types";

type Props = { open: boolean; leave?: LeaveRequest | null; onClose: () => void; onSubmit: (d: LeaveRequestSchema) => Promise<void>; };

const inp = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]";
const txt = `${inp} resize-none`;

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function LeaveForm({ open, leave, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (!open) return;
    fetchEmployees().then(setEmployees).catch(() => {});
  }, [open]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<LeaveRequestSchema>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      leaveType: "casual",
      officeId: user?.officeId ?? "main",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (leave) {
      reset({
        employeeId: leave.employeeId, employeeName: leave.employeeName,
        leaveType: leave.leaveType, fromDate: leave.fromDate, toDate: leave.toDate,
        reason: leave.reason, officeId: leave.officeId,
      });
    } else {
      reset({ leaveType: "casual", officeId: user?.officeId ?? "main" });
    }
  }, [open, leave, reset, user]);

  const selectedEmployeeId = watch("employeeId");

  function handleEmployeeChange(id: string) {
    const emp = employees.find(e => e.id === id);
    setValue("employeeId", id);
    setValue("employeeName", emp?.fullName ?? "");
    setValue("officeId", emp?.officeId ?? user?.officeId ?? "main");
  }

  if (!open) return null;

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
              <h2 className="text-base font-semibold text-foreground">{leave ? "Edit Leave Request" : "New Leave Request"}</h2>
              <p className="text-xs text-muted-foreground">{leave ? `Editing request for ${leave.employeeName}` : "Fill in leave details"}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          <Field label="Employee *" error={errors.employeeId?.message}>
            <select className={inp} value={selectedEmployeeId ?? ""} onChange={e => handleEmployeeChange(e.target.value)}>
              <option value="">Select employee</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.fullName} — {e.department}</option>)}
            </select>
          </Field>

          <Field label="Leave Type *" error={errors.leaveType?.message}>
            <select className={inp} {...register("leaveType")}>
              <option value="casual">Casual</option>
              <option value="sick">Sick</option>
              <option value="earned">Earned</option>
              <option value="emergency">Emergency</option>
              <option value="wfh">Work From Home</option>
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="From Date *" error={errors.fromDate?.message}><input className={inp} type="date" {...register("fromDate")} /></Field>
            <Field label="To Date *" error={errors.toDate?.message}><input className={inp} type="date" {...register("toDate")} /></Field>
          </div>

          <Field label="Reason *" error={errors.reason?.message}>
            <textarea className={txt} rows={3} placeholder="Reason for leave..." {...register("reason")} />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {leave ? "Save Changes" : "Submit Request"}
          </button>
        </div>

      </div>
    </div>
  );
}
