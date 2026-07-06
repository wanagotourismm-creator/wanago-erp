"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchOnboardingTasks, createOnboardingTask, updateOnboardingTask, deleteOnboardingTask,
} from "@/modules/onboarding/services/onboarding.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { OnboardingTask, OnboardingTaskFormData, OnboardingStage } from "@/modules/onboarding/types";

export function useOnboardingTasks() {
  const [tasks,   setTasks]   = useState<OnboardingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOnboardingTasks();
      setTasks(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addTask(data: OnboardingTaskFormData): Promise<{ error: string | null }> {
    try {
      const task = await createOnboardingTask(data, user?.uid ?? "");
      setTasks(prev => [task, ...prev]);
      logActivity({
        entityType: "Onboarding Task", entityName: task.taskLabel, action: "created",
        detail: `Created onboarding task ${task.refNumber} for ${task.employeeName}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to create onboarding task" };
    }
  }

  async function editTask(
    id: string, data: Partial<OnboardingTaskFormData>
  ): Promise<{ error: string | null }> {
    try {
      await updateOnboardingTask(id, data);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
      return { error: null };
    } catch {
      return { error: "Failed to update onboarding task" };
    }
  }

  async function moveStage(id: string, stage: OnboardingStage): Promise<{ error: string | null }> {
    return editTask(id, { stage });
  }

  async function removeTask(id: string): Promise<{ error: string | null }> {
    try {
      const task = tasks.find(t => t.id === id);
      await deleteOnboardingTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      if (task) {
        logActivity({
          entityType: "Onboarding Task", entityName: task.taskLabel, action: "deleted",
          detail: `Deleted onboarding task ${task.refNumber}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete onboarding task" };
    }
  }

  return { tasks, loading, load, addTask, editTask, moveStage, removeTask };
}
