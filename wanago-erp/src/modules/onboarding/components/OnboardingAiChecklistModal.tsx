"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Sparkles, ClipboardCheck } from "lucide-react";
import { draftOnboardingChecklist } from "@/modules/onboarding/services/onboarding-ai.service";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import type { Employee } from "@/modules/hrms/shared/types";
import type { OnboardingStage, OnboardingTaskFormData } from "@/modules/onboarding/types";

type DraftTask = { taskLabel: string; stage: OnboardingStage };

type Props = {
  open: boolean;
  employees: Employee[];
  onClose: () => void;
  onCreateMany: (tasks: OnboardingTaskFormData[]) => Promise<{ created: number; failed: number }>;
};

const STAGE_LABELS: Record<OnboardingStage, string> = {
  documentation: "Documentation", it_setup: "IT Setup", orientation: "Orientation", complete: "Complete",
};

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "placeholder:text-muted-foreground/60 hover:border-primary/40 focus:border-primary",
  "[&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

export function OnboardingAiChecklistModal({ open, employees, onClose, onCreateMany }: Props) {
  const { user } = useAuthStore();
  const [employeeId, setEmployeeId] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<DraftTask[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setEmployeeId(""); setTasks([]); setChecked(new Set()); setError(null);
    }
  }, [open]);

  const employee = employees.find(e => e.id === employeeId);

  async function handleGenerate() {
    if (!employee) { setError("Select an employee first."); return; }
    setDrafting(true);
    setError(null);
    const result = await draftOnboardingChecklist({ role: employee.designation, department: employee.department });
    if ("error" in result) {
      setError(result.error);
    } else {
      setTasks(result.draft.tasks);
      setChecked(new Set(result.draft.tasks.map((_, i) => i)));
    }
    setDrafting(false);
  }

  function toggle(i: number) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  async function handleCreate() {
    if (!employee) return;
    setCreating(true);
    const selected = tasks.filter((_, i) => checked.has(i));
    const payload: OnboardingTaskFormData[] = selected.map(t => ({
      employeeId: employee.id,
      employeeName: employee.fullName,
      taskLabel: t.taskLabel,
      stage: t.stage,
      dueDate: null,
      notes: null,
      officeId: employee.officeId ?? user?.officeId ?? "main",
      officeName: employee.officeName ?? user?.officeName ?? "Head Office",
    }));
    const { failed } = await onCreateMany(payload);
    setCreating(false);
    if (failed === 0) onClose();
    else setError(`${failed} task(s) failed to create — the rest were added.`);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <ClipboardCheck size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Generate Onboarding Checklist</h2>
              <p className="text-xs text-muted-foreground">AI drafts a checklist based on the employee&apos;s role — review before adding</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Employee</label>
              <select className={inputClass} value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); setTasks([]); }}>
                <option value="">Select employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.fullName} — {e.designation}</option>)}
              </select>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={drafting || !employeeId}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-60 transition-colors"
            >
              {drafting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              Generate
            </button>
          </div>

          {error && <p className="text-xs text-destructive font-medium">{error}</p>}

          {tasks.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {checked.size} of {tasks.length} selected
              </p>
              {tasks.map((t, i) => (
                <label key={i} className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2 text-sm cursor-pointer hover:bg-muted/40 transition-colors">
                  <input type="checkbox" className="h-4 w-4 rounded border-input" checked={checked.has(i)} onChange={() => toggle(i)} />
                  <span className="flex-1 text-foreground">{t.taskLabel}</span>
                  <span className="flex-shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {STAGE_LABELS[t.stage]}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || checked.size === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
          >
            {creating && <Loader2 size={14} className="animate-spin" />}
            Add {checked.size} Task{checked.size === 1 ? "" : "s"}
          </button>
        </div>

      </div>
    </div>
  );
}
