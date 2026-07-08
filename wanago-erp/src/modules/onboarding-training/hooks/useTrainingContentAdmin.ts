"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import {
  fetchTrainingModules, createTrainingModule, updateTrainingModule, deleteTrainingModule, reorderTrainingModules,
  fetchTrainingSteps, createTrainingStep, updateTrainingStep, deleteTrainingStep, reorderTrainingSteps,
} from "@/modules/onboarding-training/services/onboarding-training.service";
import type { TrainingModule, TrainingStep } from "@/modules/onboarding-training/types";
import type { TrainingModuleSchema, TrainingStepSchema } from "@/modules/onboarding-training/schemas";

export function useTrainingContentAdmin() {
  const { user } = useAuthStore();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [steps, setSteps] = useState<TrainingStep[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadModules = useCallback(async () => {
    setLoadingModules(true);
    setError(null);
    try {
      setModules(await fetchTrainingModules());
    } catch {
      setError("Failed to load training modules");
    } finally {
      setLoadingModules(false);
    }
  }, []);

  useEffect(() => { loadModules(); }, [loadModules]);

  const loadSteps = useCallback(async (moduleId: string) => {
    setLoadingSteps(true);
    try {
      setSteps(await fetchTrainingSteps(moduleId));
    } catch {
      setError("Failed to load steps for this module");
    } finally {
      setLoadingSteps(false);
    }
  }, []);

  useEffect(() => {
    if (selectedModuleId) loadSteps(selectedModuleId);
    else setSteps([]);
  }, [selectedModuleId, loadSteps]);

  const selectedModule = modules.find((m) => m.id === selectedModuleId) ?? null;

  async function addModule(data: TrainingModuleSchema) {
    if (!user) return { error: "Not signed in" };
    try {
      const m = await createTrainingModule(data, user.uid);
      setModules((p) => [...p, m]); // new modules always land at the end (next order)
      return { error: null };
    } catch { return { error: "Failed to create training module" }; }
  }

  async function editModule(id: string, data: TrainingModuleSchema) {
    try {
      await updateTrainingModule(id, data);
      setModules((p) => p.map((m) => (m.id === id ? { ...m, title: data.title, description: data.description || null, mandatory: data.mandatory ?? false } : m)));
      return { error: null };
    } catch { return { error: "Failed to update training module" }; }
  }

  async function removeModule(id: string) {
    try {
      await deleteTrainingModule(id);
      setModules((p) => p.filter((m) => m.id !== id));
      if (selectedModuleId === id) setSelectedModuleId(null);
      return { error: null };
    } catch { return { error: "Failed to delete training module" }; }
  }

  async function moveModule(id: string, direction: "up" | "down") {
    const index = modules.findIndex((m) => m.id === id);
    if (index === -1) return;
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= modules.length) return;

    const reordered = [...modules];
    [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];
    setModules(reordered);
    try {
      await reorderTrainingModules(reordered);
    } catch {
      setError("Failed to save module order");
      setModules(modules); // revert on failure
    }
  }

  async function addStep(data: TrainingStepSchema) {
    if (!user || !selectedModuleId) return { error: "Select a module first" };
    try {
      const s = await createTrainingStep(selectedModuleId, data, steps.length, user.uid);
      setSteps((p) => [...p, s]);
      return { error: null };
    } catch { return { error: "Failed to create step" }; }
  }

  async function editStep(id: string, data: TrainingStepSchema) {
    try {
      await updateTrainingStep(id, data);
      setSteps((p) => p.map((s) => (s.id === id ? {
        ...s,
        targetPath: data.targetPath, targetSelector: data.targetSelector,
        explanationEn: data.explanationEn, explanationMl: data.explanationMl,
        quiz: data.hasQuiz ? {
          questionEn: data.quizQuestionEn ?? "", questionMl: data.quizQuestionMl ?? "",
          options: data.quizOptions ?? [], correctIndex: data.quizCorrectIndex ?? 0,
        } : null,
      } : s)));
      return { error: null };
    } catch { return { error: "Failed to update step" }; }
  }

  async function removeStep(id: string) {
    try {
      await deleteTrainingStep(id);
      setSteps((p) => p.filter((s) => s.id !== id));
      return { error: null };
    } catch { return { error: "Failed to delete step" }; }
  }

  async function moveStep(id: string, direction: "up" | "down") {
    const index = steps.findIndex((s) => s.id === id);
    if (index === -1) return;
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= steps.length) return;

    const reordered = [...steps];
    [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];
    setSteps(reordered);
    try {
      await reorderTrainingSteps(reordered);
    } catch {
      setError("Failed to save step order");
      setSteps(steps); // revert on failure
    }
  }

  return {
    modules, loadingModules, error,
    selectedModule, selectedModuleId, setSelectedModuleId,
    steps, loadingSteps,
    addModule, editModule, removeModule, moveModule,
    addStep, editStep, removeStep, moveStep,
    reloadModules: loadModules,
  };
}
