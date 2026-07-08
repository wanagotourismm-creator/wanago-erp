import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { TrainingPracticeSubmission } from "@/modules/onboarding-training/types";

class TrainingPracticeSubmissionRepository extends BaseRepository<TrainingPracticeSubmission> {
  constructor() { super(FIRESTORE_COLLECTIONS.TRAINING_PRACTICE_SUBMISSIONS); }
}
const practiceRepo = new TrainingPracticeSubmissionRepository();

// Logs a "try it" submission from inside a walkthrough — demo data only,
// its own collection, never written to leads/customers/bookings/etc.
export async function submitPractice(params: {
  userId: string; moduleId: string; stepId: string; formData: Record<string, string>;
}): Promise<void> {
  await practiceRepo.create({
    userId:   params.userId,
    moduleId: params.moduleId,
    stepId:   params.stepId,
    formData: params.formData,
    status:    "active",
    createdBy: params.userId,
  });
}
