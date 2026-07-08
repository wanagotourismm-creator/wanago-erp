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
  // (Stage 2) locates the real element on it — a CSS selector once the
  // target element has a data-tour-id, or a plain description until then.
  targetPath:     string;
  targetSelector: string;
  explanationEn:  string;
  explanationMl:  string;
  quiz:           TrainingStepQuiz | null;
};
