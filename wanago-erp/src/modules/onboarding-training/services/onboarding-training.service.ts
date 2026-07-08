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
export async function fetchTrainingModules(): Promise<TrainingModule[]> {
  const modules = await moduleRepo.findMany();
  return modules.sort((a, b) => a.title.localeCompare(b.title));
}

export async function createTrainingModule(data: TrainingModuleSchema, createdBy: string): Promise<TrainingModule> {
  return moduleRepo.create({
    title:       data.title,
    description: data.description || null,
    status:      "active",
    createdBy,
  });
}

export async function updateTrainingModule(id: string, data: TrainingModuleSchema): Promise<void> {
  return moduleRepo.update(id, { title: data.title, description: data.description || null });
}

// Cascades to the module's steps too — an orphaned step with no parent
// module would just be dead data nobody could ever reach again.
export async function deleteTrainingModule(id: string): Promise<void> {
  const steps = await fetchTrainingSteps(id);
  await Promise.all(steps.map((s) => stepRepo.delete(s.id)));
  await moduleRepo.delete(id);
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
    status:         "active",
    createdBy,
  });
}

export async function updateTrainingStep(id: string, data: TrainingStepSchema): Promise<void> {
  return stepRepo.update(id, {
    targetPath:     data.targetPath,
    targetSelector: data.targetSelector,
    explanationEn:  data.explanationEn,
    explanationMl:  data.explanationMl,
    quiz:           toQuiz(data),
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
