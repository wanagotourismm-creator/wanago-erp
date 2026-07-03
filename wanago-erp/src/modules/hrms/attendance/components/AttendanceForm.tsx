"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Clock } from "lucide-react";
import { attendanceRecordSchema, type AttendanceRecordSchema } from "@/modules/hrms/attendance/schemas";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { useAuthStore } from "@/store/auth.store";
import type { Employee, AttendanceRecord } from "@/modules/hrms/shared/types";

type Props = { open: boolean; record?: AttendanceRecord | null; onClose: () => void; onSubmit: (d: AttendanceRecordSchema) => Promise<void>; error?: string | null; };

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

const today = new Date().toISOString().slice(0, 10);

export function AttendanceForm({ open, record, onClose, onSubmit, error }: Props) {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (!open) return;
    fetchEmployees().then(setEmployees).catch(() => {});
  }, [open]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<AttendanceRecordSchema>({
    resolver: zodResolver(attendanceRecordSchema),
    defaultValues: { date: today, status: "present", officeId: user?.officeId ?? "main" },
  });

  useEffect(() => {
    if (!open) return;
    if (record) {
      reset({
        employeeId: record.employeeId, employeeName: record.employeeName,
        date: record.date, status: record.status,
        clockIn: record.clockIn ?? "", clockOut: record.clockOut ?? "",
        notes: record.notes ?? "", officeId: record.officeId,
      });
    } else {
      reset({ date: today, status: "present", officeId: user?.officeId ?? "main" });
    }
  }, [open, record, reset, user]);

  const selectedEmployeeId = watch("employeeId");
  const status = watch("status");

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
              <Clock size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{record ? "Edit Attendance" : "Mark Attendance"}</h2>
              <p className="text-xs text-muted-foreground">{record ? `Editing ${record.employeeName}'s record` : "Fill in attendance details"}</p>
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
            <Field label="Date *" error={errors.date?.message}><input className={inp} type="date" {...register("date")} disabled={!!record} /></Field>
            <Field label="Status *" error={errors.status?.message}>
              <select className={inp} {...register("status")}>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="half_day">Half Day</option>
                <option value="leave">On Leave</option>
                <option value="wfh">Work From Home</option>
                <option value="holiday">Holiday</option>
              </select>
            </Field>
          </div>

          {(status === "present" || status === "half_day" || status === "wfh") && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Clock In"><input className={inp} type="time" {...register("clockIn")} /></Field>
              <Field label="Clock Out"><input className={inp} type="time" {...register("clockOut")} /></Field>
            </div>
          )}

          <Field label="Notes"><input className={inp} placeholder="Any notes..." {...register("notes")} /></Field>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {record ? "Save Changes" : "Mark Attendance"}
          </button>
        </div>

      </div>
    </div>
  );
}
