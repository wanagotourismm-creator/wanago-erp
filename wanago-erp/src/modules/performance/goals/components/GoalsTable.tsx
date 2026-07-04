"use client";

import { useState } from "react";
import { MoreHorizontal, Edit2, Trash2, AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { GOAL_STATUS_LABELS } from "@/lib/constants";
import { formatDate, initials, cn } from "@/lib/utils/helpers";
import type { Goal } from "@/modules/performance/goals/types";

type Props = {
  goals:      Goal[];
  loading:    boolean;
  canManage:  boolean;
  onEdit:     (goal: Goal) => void;
  onDelete:   (goal: Goal) => void;
  onProgress: (goal: Goal, progress: number) => void;
  onAtRisk:   (goal: Goal) => void;
};

const STATUS_STYLES: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  at_risk:     "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  completed:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export function GoalsTable({ goals, loading, canManage, onEdit, onDelete, onProgress, onAtRisk }: Props) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  if (loading) return <SkeletonTable rows={5} />;

  if (goals.length === 0) {
    return <EmptyState title="No goals set yet" description="Set your first goal to start tracking performance" icon={<span className="text-2xl">🎯</span>} />;
  }

  return (
    <div className="space-y-3">
      {goals.map(goal => (
        <div key={goal.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials(goal.employeeName)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{goal.title}</p>
                <p className="text-[11px] text-muted-foreground">{goal.employeeName} · {goal.category} · {goal.period}</p>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap", STATUS_STYLES[goal.status])}>
                {GOAL_STATUS_LABELS[goal.status]}
              </span>
              {canManage && (
                <div className="relative">
                  <button onClick={() => setMenuOpen(menuOpen === goal.id ? null : goal.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <MoreHorizontal size={15} />
                  </button>
                  {menuOpen === goal.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                      <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-border bg-card shadow-lg py-1">
                        <button onClick={() => { onEdit(goal); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                          <Edit2 size={13} /> Edit
                        </button>
                        <button onClick={() => { onAtRisk(goal); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                          <AlertTriangle size={13} /> Mark At Risk
                        </button>
                        <button onClick={() => { onDelete(goal); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full transition-all", goal.status === "at_risk" ? "bg-red-500" : goal.status === "completed" ? "bg-green-500" : "bg-primary")}
                style={{ width: `${goal.progress}%` }} />
            </div>
            <span className="w-10 flex-shrink-0 text-right text-xs font-semibold text-foreground">{goal.progress}%</span>
            {canManage && (
              <input
                type="range" min={0} max={100} step={5} value={goal.progress}
                onChange={(e) => onProgress(goal, Number(e.target.value))}
                className="w-24 flex-shrink-0 cursor-pointer accent-primary"
              />
            )}
          </div>

          {goal.dueDate && (
            <p className="mt-2 text-[11px] text-muted-foreground">Due {formatDate(goal.dueDate)}</p>
          )}
        </div>
      ))}
    </div>
  );
}
