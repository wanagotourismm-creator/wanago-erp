"use client";

import { X, Edit2, Trash2, AlertTriangle, Target, User } from "lucide-react";
import { GoalStatusBadge } from "@/modules/performance/goals/components/GoalsTable";
import { formatDate, initials, cn } from "@/lib/utils/helpers";
import type { Goal } from "@/modules/performance/goals/types";

type Props = {
  goal:       Goal | null;
  canManage:  boolean;
  onClose:    () => void;
  onEdit:     (goal: Goal) => void;
  onDelete:   (goal: Goal) => void;
  onAtRisk:   (goal: Goal) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function GoalDetailModal({ goal, canManage, onClose, onEdit, onDelete, onAtRisk }: Props) {
  if (!goal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {initials(goal.employeeName)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{goal.title}</h2>
              <p className="text-xs text-muted-foreground">{goal.refNumber} · {goal.employeeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">

          <div className="flex flex-wrap items-center gap-2">
            <GoalStatusBadge status={goal.status} />
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {goal.category}
            </span>
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {goal.period}
            </span>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Progress</p>
              <span className="text-sm font-semibold text-foreground">{goal.progress}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  goal.status === "at_risk" ? "bg-red-500" : goal.status === "completed" ? "bg-green-500" : "bg-primary"
                )}
                style={{ width: `${goal.progress}%` }}
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Target size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Goal Details</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Category" value={goal.category} />
              <Row label="Period" value={goal.period} />
              <Row label="Due Date" value={goal.dueDate ? formatDate(goal.dueDate) : null} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <User size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Assignment</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Employee" value={goal.employeeName} />
              <Row label="Office" value={goal.officeName} />
            </div>
          </div>

          {goal.description && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Description</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {goal.description}
              </p>
            </div>
          )}

        </div>

        {canManage && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(goal)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
              >
                <Edit2 size={13} /> Edit
              </button>
              <button
                onClick={() => onDelete(goal)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
            {goal.status !== "at_risk" && goal.status !== "completed" && (
              <button
                onClick={() => onAtRisk(goal)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                <AlertTriangle size={13} /> Mark At Risk
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
