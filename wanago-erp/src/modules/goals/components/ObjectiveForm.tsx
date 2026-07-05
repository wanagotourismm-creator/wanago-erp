"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Flag } from "lucide-react";
import { objectiveSchema, type ObjectiveSchema } from "@/modules/goals/schemas";
import { DEPARTMENTS } from "@/modules/hrms/employees/components/EmployeeBadges";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import type { Objective } from "@/modules/goals/types";
import type { Employee } from "@/modules/hrms/shared/types";

type Props = {
  open: boolean;
  goalId: string;
  objective?: Objective | null;
  onClose: () => void;
  onSubmit: (data: ObjectiveSchema) => Promise<void>;
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

export function ObjectiveForm({ open, goalId, objective, onClose, onSubmit }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<ObjectiveSchema>({
    resolver: zodResolver(objectiveSchema),
    defaultValues: { goalId, objectiveStatus: "on_track", progressPercent: 0 },
  });

  useEffect(() => {
    if (!open) return;
    fetchEmployees().then(setEmployees).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (objective) {
      reset({
        goalId, title: objective.title, description: objective.description,
        department: objective.department, ownerId: objective.ownerId ?? "", ownerName: objective.ownerName ?? "",
        dueDate: objective.dueDate, objectiveStatus: objective.objectiveStatus, progressPercent: objective.progressPercent,
      });
    } else {
      reset({ goalId, objectiveStatus: "on_track", progressPercent: 0 });
    }
  }, [open, objective, goalId, reset]);

  const ownerId = watch("ownerId");
  const progressPercent = watch("progressPercent");

  function handleOwnerChange(id: string) {
    const emp = employees.find((e) => e.id === id);
    setValue("ownerId", id);
    setValue("ownerName", emp?.fullName ?? "");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Flag size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{objective ? "Edit Objective" : "Add Objective"}</h2>
              <p className="text-xs text-muted-foreground">A department-level goal under this phase</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          <Field label="Title *" error={errors.title?.message}>
            <input className={inp} placeholder="e.g. Review. Realign. Recognise." {...register("title")} />
          </Field>
          <Field label="Description">
            <textarea className={`${inp} resize-none`} rows={3} placeholder="Details, sub-steps..." {...register("description")} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Department *" error={errors.department?.message}>
              <select className={inp} {...register("department")}>
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Owner">
              <select className={inp} value={ownerId ?? ""} onChange={(e) => handleOwnerChange(e.target.value)}>
                <option value="">Unassigned</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
            </Field>
            <Field label="Due Date *" error={errors.dueDate?.message}>
              <input className={inp} type="date" {...register("dueDate")} />
            </Field>
            <Field label="Status *">
              <select className={inp} {...register("objectiveStatus")}>
                <option value="on_track">On Track</option>
                <option value="at_risk">At Risk</option>
                <option value="off_track">Off Track</option>
                <option value="done">Done</option>
              </select>
            </Field>
          </div>

          <Field label={`Progress: ${progressPercent ?? 0}%`}>
            <input className="w-full accent-primary" type="range" min={0} max={100} step={5} {...register("progressPercent", { valueAsNumber: true })} />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {objective ? "Save Changes" : "Add Objective"}
          </button>
        </div>

      </div>
    </div>
  );
}
