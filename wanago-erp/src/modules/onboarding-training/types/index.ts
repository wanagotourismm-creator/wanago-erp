import type { FirestoreRecord } from "@/types/global";

export type TrainingQuizOption = {
  en: string;
  ml: string;
};

export type TrainingStepQuiz = {
  questionEn:   string;
  questionMl:   string;
  options:      TrainingQuizOption[];
  correctIndex: number;
};

export type TrainingModule = FirestoreRecord & {
  title:       string;
  description: string | null;
};

export type TrainingStep = FirestoreRecord & {
  moduleId:       string;
  order:          number;
  // Which live page this step points at, and how the walkthrough engine
  // locates the real element on it — a CSS selector such as
  // `[data-tour-id="leads-add-button"]` once the target element has that
  // attribute added to it, or a plain description until then.
  targetPath:     string;
  targetSelector: string;
  explanationEn:  string;
  explanationMl:  string;
  quiz:           TrainingStepQuiz | null;
  // Cached TTS voiceover — generated once per step+language on first
  // request (see /api/onboarding-training/tts) and reused forever after,
  // so the same narration is never re-generated (and re-billed).
  audioUrlEn:     string | null;
  audioUrlMl:     string | null;
};

// One doc per (user, module) — id is deterministic (`${userId}__${moduleId}`)
// so re-opening the same module always finds the same progress record
// instead of creating duplicates.
export type TrainingProgress = FirestoreRecord & {
  userId:            string;
  moduleId:          string;
  currentStepOrder:  number;
  completedStepIds:  string[];
  completedAt:       FirestoreRecord["createdAt"] | null;
};
