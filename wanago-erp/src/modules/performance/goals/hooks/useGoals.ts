"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchGoals, createGoal, updateGoal, updateGoalProgress, deleteGoal,
} from "@/modules/performance/goals/services/goal.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import { GOAL_STATUS } from "@/lib/constants";
import type { Goal, GoalFormData } from "@/modules/performance/goals/types";

export function useGoals() {
  const [goals,   setGoals]   = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchGoals();
      setGoals(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addGoal(data: GoalFormData): Promise<{ error: string | null }> {
    try {
      const goal = await createGoal(data, user?.uid ?? "");
      setGoals(prev => [goal, ...prev]);
      logActivity({
        entityType: "Goal", entityName: goal.employeeName, action: "created",
        detail: `Set goal ${goal.refNumber} for ${goal.employeeName}: ${goal.title}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to create goal" };
    }
  }

  async function editGoal(
    id: string, data: Partial<GoalFormData>
  ): Promise<{ error: string | null }> {
    try {
      await updateGoal(id, data);
      setGoals(prev => prev.map(g => g.id === id ? { ...g, ...data } : g));
      return { error: null };
    } catch {
      return { error: "Failed to update goal" };
    }
  }

  async function setProgress(id: string, progress: number): Promise<void> {
    const status =
      progress >= 100 ? GOAL_STATUS.COMPLETED :
      progress > 0    ? GOAL_STATUS.IN_PROGRESS :
      GOAL_STATUS.NOT_STARTED;
    await updateGoalProgress(id, progress, status);
    setGoals(prev => prev.map(g => g.id === id ? { ...g, progress, status } : g));
  }

  async function markAtRisk(id: string): Promise<void> {
    const goal = goals.find(g => g.id === id);
    await updateGoalProgress(id, goal?.progress ?? 0, GOAL_STATUS.AT_RISK);
    setGoals(prev => prev.map(g => g.id === id ? { ...g, status: GOAL_STATUS.AT_RISK } : g));
  }

  async function removeGoal(id: string): Promise<{ error: string | null }> {
    try {
      const goal = goals.find(g => g.id === id);
      await deleteGoal(id);
      setGoals(prev => prev.filter(g => g.id !== id));
      if (goal) {
        logActivity({
          entityType: "Goal", entityName: goal.employeeName, action: "deleted",
          detail: `Deleted goal ${goal.refNumber}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete goal" };
    }
  }

  return { goals, loading, load, addGoal, editGoal, setProgress, markAtRisk, removeGoal };
}
