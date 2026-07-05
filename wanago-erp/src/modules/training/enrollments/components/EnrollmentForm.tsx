"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, UserPlus } from "lucide-react";
import { trainingEnrollmentSchema, type TrainingEnrollmentSchema } from "@/modules/training/enrollments/schemas";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import type { Employee } from "@/modules/hrms/shared/types";
import type { TrainingProgram } from "@/modules/training/programs/types";

type Props = {
  open:     boolean;
  programs: TrainingProgram[];
  onClose:  () => void;
  onSubmit: (data: TrainingEnrollmentSchema) => Promise<void>;
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

export function EnrollmentForm({ open, programs, onClose, onSubmit }: Props) {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<TrainingEnrollmentSchema>({
    resolver: zodResolver(trainingEnrollmentSchema),
    defaultValues: {
      enrollmentDate: today,
      officeId:   user?.officeId   ?? "main",
      officeName: user?.officeName ?? "Head Office",
    },
  });

  useEffect(() => {
    if (!open) return;
    fetchEmployees().then(setEmployees).catch(() => {});
    reset({
      enrollmentDate: today,
      officeId:   user?.officeId   ?? "main",
      officeName: user?.officeName ?? "Head Office",
    });
  }, [open, reset, user]);

  const selectedEmployeeId = watch("employeeId");
  const selectedProgramId  = watch("trainingProgramId");

  function handleEmployeeChange(id: string) {
    const emp = employees.find(e => e.id === id);
    setValue("employeeId", id);
    setValue("employeeName", emp?.fullName ?? "");
  }

  function handleProgramChange(id: string) {
    const program = programs.find(p => p.id === id);
    setValue("trainingProgramId", id);
    setValue("trainingProgramTitle", program?.title ?? "");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <UserPlus size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Enroll Employee</h2>
              <p className="text-xs text-muted-foreground">Add an employee to a training program</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          <Field label="Training Program" required error={errors.trainingProgramId?.message}>
            <select className={inputClass} value={selectedProgramId ?? ""} onChange={e => handleProgramChange(e.target.value)}>
              <option value="">Select program</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </Field>

          <Field label="Employee" required error={errors.employeeId?.message}>
            <select className={inputClass} value={selectedEmployeeId ?? ""} onChange={e => handleEmployeeChange(e.target.value)}>
              <option value="">Select employee</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.fullName} — {e.designation}</option>)}
            </select>
          </Field>

          <Field label="Enrollment Date" required error={errors.enrollmentDate?.message}>
            <input className={inputClass} type="date" {...register("enrollmentDate")} />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Enroll
          </button>
        </div>

      </div>
    </div>
  );
}
