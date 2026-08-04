"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Wallet } from "lucide-react";
import { payrollRecordSchema, type PayrollRecordSchema } from "@/modules/hrms/payroll/schemas";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { fetchBookings } from "@/modules/bookings/services/booking.service";
import { fetchLeads } from "@/modules/leads/services/lead.service";
import { fetchIncentiveSettings } from "@/modules/incentives/settings/services/incentive-settings.service";
import { fetchLeavesByEmployee } from "@/modules/hrms/leaves/services/leave.service";
import { computeAgentIncentiveSummaries } from "@/modules/incentives/lib/calculateIncentives";
import { MONTH_LABELS } from "@/modules/hrms/payroll/components/PayrollBadges";
import { useAuthStore } from "@/store/auth.store";
import { Modal } from "@/components/ui/Modal";
import type { Employee, PayrollRecord } from "@/modules/hrms/shared/types";
import type { AgentIncentiveSummary } from "@/modules/incentives/types";

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
  const [incentiveSummaries, setIncentiveSummaries] = useState<AgentIncentiveSummary[]>([]);

  useEffect(() => {
    if (!open) return;
    fetchEmployees().then(setEmployees).catch(() => {});
    // Same computeAgentIncentiveSummaries the Incentives page uses (see
    // useIncentives.ts) — previously HR had to keep that page open in
    // another tab and retype the number here, with real risk of
    // transcription drift between the two. Best-effort: a failure here just
    // means the Incentives field starts blank/manual, same as before.
    Promise.all([
      fetchBookings({ status: "confirmed" }),
      fetchLeads(),
      fetchEmployees(),
      fetchIncentiveSettings(),
    ]).then(([bookings, leads, allEmployees, settings]) => {
      const leadsById     = new Map(leads.map((l) => [l.id, l]));
      const employeesById = new Map(allEmployees.map((e) => [e.id, e]));
      setIncentiveSummaries(computeAgentIncentiveSummaries(bookings, leadsById, employeesById, settings));
    }).catch(() => {});
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
  const selectedMonth = watch("month");
  const selectedYear  = watch("year");

  function handleEmployeeChange(id: string) {
    const emp = employees.find(e => e.id === id);
    setValue("employeeId", id);
    setValue("employeeName", emp?.fullName ?? "");
    setValue("basicSalary", emp?.basicSalary ?? 0);
    setValue("hra", emp?.hra ?? 0);
    setValue("allowances", emp?.allowances ?? 0);
    setValue("officeId", emp?.officeId ?? user?.officeId ?? "main");
  }

  // Auto-fills Incentives from the same computation the Incentives page
  // shows, whenever employee/month/year are all picked — only on create
  // (an existing record's incentives were presumably already reviewed/
  // adjusted, so editing shouldn't silently overwrite them). Re-runs on
  // every change to any of the three, same as the employee-change handler
  // above overwriting basicSalary/hra/allowances on every reselect.
  useEffect(() => {
    if (record) return;
    if (!selectedEmployeeId || !selectedMonth || !selectedYear) return;
    // watch() reflects the <select>'s raw string value until zod's
    // coercion runs at submit time, not a number — compare as numbers
    // explicitly rather than relying on RHF to have coerced it already.
    const monthNum = Number(selectedMonth);
    const yearNum  = Number(selectedYear);
    // PayrollRecord.month is 1-indexed (MONTH_LABELS[1..12]); computeAgentIncentiveSummaries
    // groups by JS Date.getMonth() (0-indexed) — off-by-one here would
    // silently match the wrong month every time.
    const match = incentiveSummaries.find(
      s => s.agentId === selectedEmployeeId && s.month === monthNum - 1 && s.year === yearNum
    );
    setValue("incentives", match?.incentiveAmount ?? 0);
  }, [record, selectedEmployeeId, selectedMonth, selectedYear, incentiveSummaries, setValue]);

  // Auto-fills Deductions from approved Loss-of-Pay leave days that fall in
  // the selected month — previously HR had to cross-reference the Leaves
  // page and hand-calculate this every time. A leave request is attributed
  // to the month it *starts* in (not clipped day-by-day across a month
  // boundary) — a deliberate simplification, flagged here rather than
  // silently guessing at a more precise split. Daily rate is basicSalary /
  // calendar days in the month, the standard convention this app already
  // uses nowhere else, so it's spelled out below rather than imported.
  useEffect(() => {
    if (record) return;
    if (!selectedEmployeeId || !selectedMonth || !selectedYear) return;
    const emp = employees.find(e => e.id === selectedEmployeeId);
    if (!emp) return;
    const monthNum = Number(selectedMonth);
    const yearNum  = Number(selectedYear);

    fetchLeavesByEmployee(selectedEmployeeId).then((leaves) => {
      const lopDays = leaves
        .filter(l => l.leaveType === "loss_of_pay" && l.status === "approved")
        .filter(l => {
          const [y, m] = l.fromDate.split("-").map(Number);
          return y === yearNum && m === monthNum;
        })
        .reduce((sum, l) => sum + l.days, 0);

      if (lopDays === 0) return;
      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
      const dailyRate = emp.basicSalary ? emp.basicSalary / daysInMonth : 0;
      setValue("deductions", Math.round(dailyRate * lopDays));
    }).catch(() => {});
  }, [record, selectedEmployeeId, selectedMonth, selectedYear, employees, setValue]);

  if (!open) return null;

  return (
    <Modal onClose={onClose}>

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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

    </Modal>
  );
}
