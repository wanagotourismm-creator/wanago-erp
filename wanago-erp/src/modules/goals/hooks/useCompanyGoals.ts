"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchGoals, createGoal, updateGoal, deleteGoal,
  fetchObjectivesByGoal, createObjective, updateObjective, deleteObjective,
  fetchCheckInsByGoal, createCheckIn,
} from "@/modules/goals/services/goal.service";
import { useAuthStore } from "@/store/auth.store";
import type { CompanyGoal, Objective, GoalCheckIn } from "@/modules/goals/types";
import type { CompanyGoalSchema, ObjectiveSchema, CheckInSchema } from "@/modules/goals/schemas";

export function useCompanyGoals() {
  const { user } = useAuthStore();
  const [goals, setGoals] = useState<CompanyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [checkIns, setCheckIns] = useState<GoalCheckIn[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const g = await fetchGoals();
      setGoals(g);
      setSelectedGoalId((prev) => prev ?? g[0]?.id ?? null);
    } catch (e) {
      console.error("[useCompanyGoals] failed to load goals:", e);
      setError("Failed to load company goals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadDetail = useCallback(async (goalId: string) => {
    setDetailLoading(true);
    try {
      const [objs, chks] = await Promise.all([fetchObjectivesByGoal(goalId), fetchCheckInsByGoal(goalId)]);
      setObjectives(objs);
      setCheckIns(chks);
    } catch (e) {
      console.error("[useCompanyGoals] failed to load goal detail:", e);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedGoalId) loadDetail(selectedGoalId);
    else { setObjectives([]); setCheckIns([]); }
  }, [selectedGoalId, loadDetail]);

  async function addGoal(data: CompanyGoalSchema) {
    try {
      const g = await createGoal(data, user?.uid ?? "");
      setGoals((p) => [g, ...p]);
      setSelectedGoalId(g.id);
      return g;
    } catch (e) {
      console.error("[useCompanyGoals] failed to create goal:", e);
      return null;
    }
  }

  async function editGoal(id: string, data: Partial<CompanyGoalSchema>) {
    try {
      await updateGoal(id, data);
      setGoals((p) => p.map((g) => (g.id === id ? { ...g, ...data } : g)));
    } catch (e) {
      console.error("[useCompanyGoals] failed to update goal:", e);
    }
  }

  async function removeGoal(id: string) {
    try {
      await deleteGoal(id);
      setGoals((p) => p.filter((g) => g.id !== id));
      setSelectedGoalId((prev) => (prev === id ? null : prev));
    } catch (e) {
      console.error("[useCompanyGoals] failed to delete goal:", e);
    }
  }

  async function addObjective(data: ObjectiveSchema) {
    try {
      const o = await createObjective(data, user?.uid ?? "");
      setObjectives((p) => [o, ...p]);
    } catch (e) {
      console.error("[useCompanyGoals] failed to create objective:", e);
    }
  }

  async function editObjective(id: string, data: Partial<ObjectiveSchema>) {
    try {
      await updateObjective(id, data);
      setObjectives((p) => p.map((o) => (o.id === id ? { ...o, ...data } as Objective : o)));
    } catch (e) {
      console.error("[useCompanyGoals] failed to update objective:", e);
    }
  }

  async function removeObjective(id: string) {
    try {
      await deleteObjective(id);
      setObjectives((p) => p.filter((o) => o.id !== id));
    } catch (e) {
      console.error("[useCompanyGoals] failed to delete objective:", e);
    }
  }

  async function postCheckIn(data: CheckInSchema) {
    try {
      const c = await createCheckIn(data, user?.uid ?? "", user?.displayName ?? user?.email ?? "Someone");
      setCheckIns((p) => [c, ...p]);
    } catch (e) {
      console.error("[useCompanyGoals] failed to post check-in:", e);
    }
  }

  const selectedGoal = goals.find((g) => g.id === selectedGoalId) ?? null;
  const avgProgress = objectives.length === 0 ? 0 : Math.round(objectives.reduce((s, o) => s + o.progressPercent, 0) / objectives.length);

  return {
    goals, loading, error, selectedGoal, selectedGoalId, setSelectedGoalId,
    objectives, checkIns, detailLoading, avgProgress,
    addGoal, editGoal, removeGoal, addObjective, editObjective, removeObjective, postCheckIn,
  };
}
