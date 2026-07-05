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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const g = await fetchGoals();
      setGoals(g);
      setSelectedGoalId((prev) => prev ?? g[0]?.id ?? null);
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
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedGoalId) loadDetail(selectedGoalId);
    else { setObjectives([]); setCheckIns([]); }
  }, [selectedGoalId, loadDetail]);

  async function addGoal(data: CompanyGoalSchema) {
    const g = await createGoal(data, user?.uid ?? "");
    setGoals((p) => [g, ...p]);
    setSelectedGoalId(g.id);
    return g;
  }

  async function editGoal(id: string, data: Partial<CompanyGoalSchema>) {
    await updateGoal(id, data);
    setGoals((p) => p.map((g) => (g.id === id ? { ...g, ...data } : g)));
  }

  async function removeGoal(id: string) {
    await deleteGoal(id);
    setGoals((p) => p.filter((g) => g.id !== id));
    setSelectedGoalId((prev) => (prev === id ? null : prev));
  }

  async function addObjective(data: ObjectiveSchema) {
    const o = await createObjective(data, user?.uid ?? "");
    setObjectives((p) => [o, ...p]);
  }

  async function editObjective(id: string, data: Partial<ObjectiveSchema>) {
    await updateObjective(id, data);
    setObjectives((p) => p.map((o) => (o.id === id ? { ...o, ...data } as Objective : o)));
  }

  async function removeObjective(id: string) {
    await deleteObjective(id);
    setObjectives((p) => p.filter((o) => o.id !== id));
  }

  async function postCheckIn(data: CheckInSchema) {
    const c = await createCheckIn(data, user?.uid ?? "", user?.displayName ?? user?.email ?? "Someone");
    setCheckIns((p) => [c, ...p]);
  }

  const selectedGoal = goals.find((g) => g.id === selectedGoalId) ?? null;
  const avgProgress = objectives.length === 0 ? 0 : Math.round(objectives.reduce((s, o) => s + o.progressPercent, 0) / objectives.length);

  return {
    goals, loading, selectedGoal, selectedGoalId, setSelectedGoalId,
    objectives, checkIns, detailLoading, avgProgress,
    addGoal, editGoal, removeGoal, addObjective, editObjective, removeObjective, postCheckIn,
  };
}
