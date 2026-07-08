import { create } from "zustand";
import type { TrainingStep } from "@/modules/onboarding-training/types";

// Pure UI/navigation state for the active walkthrough — lives outside the
// React tree (like teamspace-ui.store.ts) so it survives the AppShell
// remounting on every cross-section route change while the walkthrough
// itself navigates the user across real pages.
type WalkthroughState = {
  active:         boolean;
  moduleId:       string | null;
  moduleTitle:    string;
  steps:          TrainingStep[];
  stepIndex:      number;
  language:       "en" | "ml";
  quizModalOpen:  boolean;
  quizSelected:   number | null;
  quizResult:     "correct" | "wrong" | null;
  // Presentation-style playback — once a step's narration finishes (or a
  // short dwell time elapses when there's no audio yet), the walkthrough
  // advances itself instead of waiting for a click. Quiz steps still pause
  // for a real answer regardless of this setting.
  autoAdvance:    boolean;

  start:        (moduleId: string, title: string, steps: TrainingStep[], resumeIndex: number) => void;
  exit:         () => void;
  goToStep:     (index: number) => void;
  setLanguage:  (lang: "en" | "ml") => void;
  setAutoAdvance: (on: boolean) => void;
  openQuiz:     () => void;
  selectAnswer: (index: number) => void;
  submitQuiz:   () => void;
  reviewStep:   () => void; // wrong answer — close the quiz, stay on this step
};

export const useTrainingWalkthroughStore = create<WalkthroughState>((set, get) => ({
  active:        false,
  moduleId:      null,
  moduleTitle:   "",
  steps:         [],
  stepIndex:     0,
  language:      "en",
  quizModalOpen: false,
  quizSelected:  null,
  quizResult:    null,
  autoAdvance:   true,

  start: (moduleId, title, steps, resumeIndex) => set({
    active: true, moduleId, moduleTitle: title, steps,
    stepIndex: Math.min(resumeIndex, Math.max(steps.length - 1, 0)),
    quizModalOpen: false, quizSelected: null, quizResult: null,
  }),

  exit: () => set({ active: false, moduleId: null, moduleTitle: "", steps: [], stepIndex: 0 }),

  goToStep: (index) => set({ stepIndex: index, quizModalOpen: false, quizSelected: null, quizResult: null }),

  setLanguage: (language) => set({ language }),

  setAutoAdvance: (autoAdvance) => set({ autoAdvance }),

  openQuiz: () => set({ quizModalOpen: true, quizSelected: null, quizResult: null }),

  selectAnswer: (index) => set({ quizSelected: index }),

  submitQuiz: () => {
    const { steps, stepIndex, quizSelected } = get();
    const quiz = steps[stepIndex]?.quiz;
    if (!quiz || quizSelected == null) return;
    set({ quizResult: quizSelected === quiz.correctIndex ? "correct" : "wrong" });
  },

  reviewStep: () => set({ quizModalOpen: false, quizSelected: null, quizResult: null }),
}));
