"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useTrainingWalkthroughStore } from "@/store/training-walkthrough.store";
import { fetchTrainingSteps } from "@/modules/onboarding-training/services/onboarding-training.service";
import { ensureProgress, updateProgress } from "@/modules/onboarding-training/services/training-progress.service";
import type { TrainingModule } from "@/modules/onboarding-training/types";

export function useTrainingWalkthrough() {
  const store = useTrainingWalkthroughStore();
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);
  const [justCompleted, setJustCompleted] = useState<string | null>(null); // module title, for a completion toast

  const currentStep = store.steps[store.stepIndex] ?? null;
  const isLastStep = store.stepIndex >= store.steps.length - 1;

  async function startModule(module: TrainingModule) {
    if (!user) return;
    setStarting(true);
    try {
      const [steps, progress] = await Promise.all([
        fetchTrainingSteps(module.id),
        ensureProgress(user.uid, module.id),
      ]);
      if (steps.length === 0) return;
      setCompletedStepIds(progress.completedStepIds ?? []);
      // A previously-completed module reopens from the start (a re-watch),
      // not stuck at the last step with nowhere to go.
      const resumeIndex = progress.completedAt ? 0 : Math.min(progress.currentStepOrder ?? 0, steps.length - 1);
      store.start(module.id, module.title, steps, resumeIndex);
    } finally {
      setStarting(false);
    }
  }

  // Walk the user to the current step's real page whenever it changes.
  useEffect(() => {
    if (!store.active || !currentStep) return;
    if (pathname !== currentStep.targetPath) {
      router.push(currentStep.targetPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.active, store.stepIndex, currentStep?.targetPath]);

  async function goNext() {
    if (!user || !store.moduleId || !currentStep) return;
    const stepQuizPassed = store.quizResult === "correct" || completedStepIds.includes(currentStep.id);
    if (currentStep.quiz && !stepQuizPassed) {
      store.openQuiz();
      return;
    }

    const nextCompleted = completedStepIds.includes(currentStep.id) ? completedStepIds : [...completedStepIds, currentStep.id];
    setCompletedStepIds(nextCompleted);

    if (isLastStep) {
      await updateProgress(user.uid, store.moduleId, {
        currentStepOrder: store.stepIndex, completedStepIds: nextCompleted, completed: true,
      });
      setJustCompleted(store.moduleTitle);
      store.exit();
      return;
    }

    const newIndex = store.stepIndex + 1;
    await updateProgress(user.uid, store.moduleId, { currentStepOrder: newIndex, completedStepIds: nextCompleted });
    store.goToStep(newIndex);
  }

  function goBack() {
    if (store.stepIndex > 0) store.goToStep(store.stepIndex - 1);
  }

  function dismissCompletion() { setJustCompleted(null); }

  // A step's quiz counts as passed either this session (quizResult) or
  // already-persisted from a previous session (completedStepIds) — so
  // going Back to a step you already cleared doesn't re-force the quiz.
  const quizPassed = !!currentStep && (store.quizResult === "correct" || completedStepIds.includes(currentStep.id));

  return {
    ...store, currentStep, isLastStep, starting, justCompleted, completedStepIds, quizPassed,
    startModule, goNext, goBack, dismissCompletion,
  };
}
