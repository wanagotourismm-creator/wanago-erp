"use client";

import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { useOnboardingTasks } from "@/modules/onboarding/hooks/useOnboardingTasks";
import { OnboardingBoard } from "@/modules/onboarding/components/OnboardingBoard";
import { OnboardingTaskForm } from "@/modules/onboarding/components/OnboardingTaskForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import type { OnboardingStage, OnboardingTask } from "@/modules/onboarding/types";
import type { OnboardingTaskSchema } from "@/modules/onboarding/schemas";

export function OnboardingPage() {
  const { tasks, loading, load, addTask, moveStage } = useOnboardingTasks();
  const [formOpen, setFormOpen] = useState(false);

  async function handleSubmit(data: OnboardingTaskSchema) {
    await addTask({
      ...data,
      dueDate: data.dueDate || null,
      notes:   data.notes   || null,
    });
    setFormOpen(false);
  }

  function handleMoveStage(task: OnboardingTask, nextStage: OnboardingStage) {
    moveStage(task.id, nextStage);
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Onboarding"
        description="New-hire checklist and pipeline"
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>Refresh</Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setFormOpen(true)}>Add Task</Button>
          </>
        }
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <OnboardingBoard tasks={tasks} loading={false} onMoveStage={handleMoveStage} />
      )}

      <OnboardingTaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

    </div>
  );
}
