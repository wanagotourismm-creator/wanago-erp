import { where } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { TrainingModule, TrainingStep } from "@/modules/onboarding-training/types";
import type { TrainingModuleSchema, TrainingStepSchema } from "@/modules/onboarding-training/schemas";

class TrainingModuleRepository extends BaseRepository<TrainingModule> {
  constructor() { super(FIRESTORE_COLLECTIONS.ONBOARDING_TRAINING_MODULES); }
}
class TrainingStepRepository extends BaseRepository<TrainingStep> {
  constructor() { super(FIRESTORE_COLLECTIONS.ONBOARDING_TRAINING_STEPS); }
}

const moduleRepo = new TrainingModuleRepository();
const stepRepo = new TrainingStepRepository();

// ── Modules ──────────────────────────────────────────────────
// Sorted by `order` (lower first) — legacy modules created before this
// field existed fall back to alphabetical, after any ordered ones.
export async function fetchTrainingModules(): Promise<TrainingModule[]> {
  const modules = await moduleRepo.findMany();
  return modules.sort((a, b) => {
    const ao = a.order ?? Infinity, bo = b.order ?? Infinity;
    if (ao !== bo) return ao - bo;
    return a.title.localeCompare(b.title);
  });
}

export async function createTrainingModule(data: TrainingModuleSchema, createdBy: string): Promise<TrainingModule> {
  const existing = await moduleRepo.findMany();
  const nextOrder = existing.reduce((max, m) => Math.max(max, m.order ?? -1), -1) + 1;
  return moduleRepo.create({
    title:       data.title,
    description: data.description || null,
    mandatory:   data.mandatory ?? false,
    order:       nextOrder,
    status:      "active",
    createdBy,
  });
}

export async function updateTrainingModule(id: string, data: TrainingModuleSchema): Promise<void> {
  return moduleRepo.update(id, { title: data.title, description: data.description || null, mandatory: data.mandatory ?? false });
}

// Cascades to the module's steps too — an orphaned step with no parent
// module would just be dead data nobody could ever reach again.
export async function deleteTrainingModule(id: string): Promise<void> {
  const steps = await fetchTrainingSteps(id);
  await Promise.all(steps.map((s) => stepRepo.delete(s.id)));
  await moduleRepo.delete(id);
}

// Persists a full reordering (after a move-up/move-down action) by
// re-stamping every module's `order` to match its new position.
export async function reorderTrainingModules(modules: TrainingModule[]): Promise<void> {
  await Promise.all(modules.map((m, i) => moduleRepo.update(m.id, { order: i })));
}

// ── Steps ────────────────────────────────────────────────────
// Note: sorted client-side (not via Firestore orderBy) so this query only
// needs a single-field index on moduleId, consistent with the rest of the
// codebase's convention of avoiding manual composite index deployment.
export async function fetchTrainingSteps(moduleId: string): Promise<TrainingStep[]> {
  const steps = await stepRepo.findMany({ constraints: [where("moduleId", "==", moduleId)] });
  return steps.sort((a, b) => a.order - b.order);
}

function toQuiz(data: TrainingStepSchema): TrainingStep["quiz"] {
  if (!data.hasQuiz) return null;
  return {
    questionEn:   data.quizQuestionEn ?? "",
    questionMl:   data.quizQuestionMl ?? "",
    options:      data.quizOptions ?? [],
    correctIndex: data.quizCorrectIndex ?? 0,
  };
}

function toPracticeForm(data: TrainingStepSchema): TrainingStep["practiceForm"] {
  if (!data.hasPracticeForm) return null;
  return {
    titleEn:       data.practiceTitleEn ?? "",
    titleMl:       data.practiceTitleMl ?? "",
    submitLabelEn: data.practiceSubmitLabelEn?.trim() || "Submit",
    submitLabelMl: data.practiceSubmitLabelMl?.trim() || "സമർപ്പിക്കുക",
    fields:        (data.practiceFields ?? []).map((f) => ({ ...f, placeholder: f.placeholder ?? "" })),
  };
}

export async function createTrainingStep(
  moduleId: string, data: TrainingStepSchema, order: number, createdBy: string
): Promise<TrainingStep> {
  return stepRepo.create({
    moduleId, order,
    targetPath:     data.targetPath,
    targetSelector: data.targetSelector,
    explanationEn:  data.explanationEn,
    explanationMl:  data.explanationMl,
    quiz:           toQuiz(data),
    practiceForm:   toPracticeForm(data),
    audioUrlEn:     null,
    audioUrlMl:     null,
    status:         "active",
    createdBy,
  });
}

// Editing a step's text invalidates any cached voiceover for it — both
// languages are cleared unconditionally rather than diffed, so a stale
// narration can never linger after an edit. The next time either language
// is played, /api/onboarding-training/tts regenerates it once.
export async function updateTrainingStep(id: string, data: TrainingStepSchema): Promise<void> {
  return stepRepo.update(id, {
    targetPath:     data.targetPath,
    targetSelector: data.targetSelector,
    explanationEn:  data.explanationEn,
    explanationMl:  data.explanationMl,
    quiz:           toQuiz(data),
    practiceForm:   toPracticeForm(data),
    audioUrlEn:     null,
    audioUrlMl:     null,
  });
}

export async function deleteTrainingStep(id: string): Promise<void> {
  return stepRepo.delete(id);
}

// Persists a full reordering (after a move-up/move-down action) by
// re-stamping every step's `order` to match its new position.
export async function reorderTrainingSteps(steps: TrainingStep[]): Promise<void> {
  await Promise.all(steps.map((s, i) => stepRepo.update(s.id, { order: i })));
}
