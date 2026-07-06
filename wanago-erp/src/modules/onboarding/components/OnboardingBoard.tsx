"use client";

import { ArrowRight, ClipboardList } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils/helpers";
import type { OnboardingStage, OnboardingTask } from "@/modules/onboarding/types";

type Props = {
  tasks:   OnboardingTask[];
  loading: boolean;
  onMoveStage: (task: OnboardingTask, nextStage: OnboardingStage) => void;
};

const STAGES: { key: OnboardingStage; label: string }[] = [
  { key: "documentation", label: "Documentation" },
  { key: "it_setup",      label: "IT Setup" },
  { key: "orientation",   label: "Orientation" },
  { key: "complete",      label: "Complete" },
];

function nextStageOf(stage: OnboardingStage): OnboardingStage | null {
  const idx = STAGES.findIndex(s => s.key === stage);
  if (idx === -1 || idx === STAGES.length - 1) return null;
  return STAGES[idx + 1].key;
}

export function OnboardingBoard({ tasks, loading, onMoveStage }: Props) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STAGES.map(stage => {
        const stageTasks = tasks.filter(t => t.stage === stage.key);
        const next = nextStageOf(stage.key);
        const nextLabel = next ? STAGES.find(s => s.key === next)?.label : null;

        return (
          <Card key={stage.key} className="flex flex-col">
            <CardHeader>
              <CardTitle>{stage.label}</CardTitle>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
                {stageTasks.length}
              </span>
            </CardHeader>

            {stageTasks.length === 0 ? (
              <EmptyState
                icon={<ClipboardList size={20} />}
                title="No tasks"
                className="py-8"
              />
            ) : (
              <div className="space-y-2.5">
                {stageTasks.map(task => (
                  <div key={task.id} className="rounded-2xl border border-border bg-background p-3 shadow-sm">
                    <p className="text-sm font-semibold text-foreground">{task.employeeName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{task.taskLabel}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Due: {task.dueDate ? formatDate(task.dueDate) : "—"}
                    </p>
                    {next && (
                      <button
                        onClick={() => onMoveStage(task, next)}
                        className="mt-2 inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
                      >
                        Move to {nextLabel} <ArrowRight size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
