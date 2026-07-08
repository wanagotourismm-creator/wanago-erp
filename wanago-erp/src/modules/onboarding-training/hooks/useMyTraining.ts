"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { fetchTrainingModules, fetchTrainingSteps } from "@/modules/onboarding-training/services/onboarding-training.service";
import { fetchAllProgressForUser } from "@/modules/onboarding-training/services/training-progress.service";
import type { TrainingModule, TrainingProgress } from "@/modules/onboarding-training/types";

export type ModuleWithProgress = {
  module:        TrainingModule;
  totalSteps:    number;
  completedCount: number;
  percent:       number;
  isComplete:    boolean;
  started:       boolean;
};

export function useMyTraining() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<ModuleWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [modules, progress] = await Promise.all([
        fetchTrainingModules(),
        fetchAllProgressForUser(user.uid),
      ]);
      const progressByModule = new Map<string, TrainingProgress>(progress.map((p) => [p.moduleId, p]));
      const stepLists = await Promise.all(modules.map((m) => fetchTrainingSteps(m.id)));

      setItems(modules.map((module, i) => {
        const totalSteps = stepLists[i].length;
        const p = progressByModule.get(module.id);
        const completedCount = p?.completedStepIds?.length ?? 0;
        return {
          module, totalSteps, completedCount,
          percent: totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0,
          isComplete: !!p?.completedAt,
          started: !!p,
        };
      }));
    } catch {
      setError("Failed to load training modules");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return { items, loading, error, reload: load };
}
