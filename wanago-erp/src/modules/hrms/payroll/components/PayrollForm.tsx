"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Wallet } from "lucide-react";
import { payrollRecordSchema, type PayrollRecordSchema } from "@/modules/hrms/payroll/schemas";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { MONTH_LABELS } from "@/modules/hrms/payroll/components/PayrollBadges";
import { useAuthStore } from "@/store/auth.store";
import type { Employee, PayrollRecord } from "@/modules/hrms/shared/types";

type Props = { open: boolean; record?: PayrollRecord | null; onClose: () => void; onSubmit: (d: PayrollRecordSchema) => Promise<void>; error?: string | null; };

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

const now = new Date();

export function PayrollForm({ open, record, onClose, onSubmit, error }: Props) {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (!open) return;
    fetchEmployees().then(setEmployees).catch(() => {});
  }, [open]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<PayrollRecordSchema>({
    resolver: zodResolver(payrollRecordSchema),
    defaultValues: {
      month: now.getMonth() + 1, year: now.getFullYear(),
      basicSalary: 0, hra: 0, allowances: 0, incentives: 0, bonus: 0, deductions: 0,
      officeId: user?.officeId ?? "main",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (record) {
      reset({
        employeeId: record.employeeId, employeeName: record.employeeName,
        month: record.month, year: record.year,
        basicSalary: record.basicSalary, hra: record.hra, allowances: record.allowances,
        incentives: record.incentives, bonus: record.bonus, deductions: record.deductions,
        officeId: record.officeId,
      });
    } else {
      reset({
        month: now.getMonth() + 1, year: now.getFullYear(),
        basicSalary: 0, hra: 0, allowances: 0, incentives: 0, bonus: 0, deductions: 0,
        officeId: user?.officeId ?? "main",
      });
    }
  }, [open, record, reset, user]);

  const selectedEmployeeId = watch("employeeId");

  function handleEmployeeChange(id: string) {
    const emp = employees.find(e => e.id === id);
    setValue("employeeId", id);
    setValue("employeeName", emp?.fullName ?? "");
    setValue("basicSalary", emp?.basicSalary ?? 0);
    setValue("hra", emp?.hra ?? 0);
    setValue("allowances", emp?.allowances ?? 0);
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
              <Wallet size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{record ? "Edit Payroll" : "Generate Payroll"}</h2>
              <p className="text-xs text-muted-foreground">{record ? `Editing ${record.employeeName}'s record` : "Fill in payroll details"}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
          )}

          <Field label="Employee *" error={errors.employeeId?.message}>
            <select className={inp} value={selectedEmployeeId ?? ""} onChange={e => handleEmployeeChange(e.target.value)} disabled={!!record}>
              <option value="">Select employee</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.fullName} — {e.department}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Month *" error={errors.month?.message}>
              <select className={inp} {...register("month")} disabled={!!record}>
                {MONTH_LABELS.slice(1).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </Field>
            <Field label="Year *" error={errors.year?.message}>
              <input className={inp} type="number" {...register("year")} disabled={!!record} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Basic Salary" error={errors.basicSalary?.message}><input className={inp} type="number" min={0} {...register("basicSalary")} /></Field>
            <Field label="HRA" error={errors.hra?.message}><input className={inp} type="number" min={0} {...register("hra")} /></Field>
            <Field label="Allowances" error={errors.allowances?.message}><input className={inp} type="number" min={0} {...register("allowances")} /></Field>
            <Field label="Incentives" error={errors.incentives?.message}><input className={inp} type="number" min={0} {...register("incentives")} /></Field>
            <Field label="Bonus" error={errors.bonus?.message}><input className={inp} type="number" min={0} {...register("bonus")} /></Field>
            <Field label="Deductions" error={errors.deductions?.message}><input className={inp} type="number" min={0} {...register("deductions")} /></Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {record ? "Save Changes" : "Generate"}
          </button>
        </div>

      </div>
    </div>
  );
}
