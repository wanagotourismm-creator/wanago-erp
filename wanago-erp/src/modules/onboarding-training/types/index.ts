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

export type TrainingPracticeField = {
  key:         string; // form data key, e.g. "customerName"
  labelEn:     string;
  labelMl:     string;
  placeholder: string;
  type:        "text" | "textarea";
};

// A lookalike form rendered entirely inside the walkthrough itself — not
// the real page's actual form. Lets an employee practice "using the tool"
// hands-on without ever touching real leads/customers/bookings/etc. data;
// submissions land in their own trainingPracticeSubmissions collection.
export type TrainingPracticeForm = {
  titleEn:      string;
  titleMl:      string;
  submitLabelEn: string;
  submitLabelMl: string;
  fields:       TrainingPracticeField[];
};

export type TrainingModule = FirestoreRecord & {
  title:       string;
  description: string | null;
  // Controls listing order on My Training / the admin catalog — lower
  // shows first. Reorderable via up/down arrows in the admin UI.
  order:       number;
  // Admin setting only, tracked but NOT currently enforced anywhere — no
  // ERP section is gated behind this yet (that needs an explicit decision
  // on which modules qualify before any access restriction goes live).
  mandatory:   boolean;
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
  // Optional hands-on "try it" form shown inside the walkthrough — see
  // TrainingPracticeForm for why this never touches real app data.
  practiceForm:   TrainingPracticeForm | null;
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

// A logged "try it" practice submission — demo data only, entirely
// separate from any real collection (leads, customers, bookings, etc.).
export type TrainingPracticeSubmission = FirestoreRecord & {
  userId:    string;
  moduleId:  string;
  stepId:    string;
  formData:  Record<string, string>;
};

// One per module completion — auto-created the moment an employee finishes
// every step (and passes every quiz) in a module. certificateId is a short
// human-shareable verification code printed on the PDF itself.
export type TrainingCertificate = FirestoreRecord & {
  employeeUserId: string;
  employeeName:   string;
  employeeEmail:  string;
  moduleId:       string;
  moduleTitle:    string;
  certificateId:  string;
  pdfUrl:         string;
  completedAt:    FirestoreRecord["createdAt"];
};
