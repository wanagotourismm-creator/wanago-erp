import { orderBy } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import type { OnboardingTask, OnboardingTaskFormData } from "@/modules/onboarding/types";

class OnboardingTaskRepository extends BaseRepository<OnboardingTask> {
  constructor() { super(FIRESTORE_COLLECTIONS.ONBOARDING_TASKS); }
}
const repo = new OnboardingTaskRepository();

export async function fetchOnboardingTasks(): Promise<OnboardingTask[]> {
  return repo.findMany({ constraints: [orderBy("createdAt", "desc")] });
}

export async function createOnboardingTask(
  data: OnboardingTaskFormData,
  createdBy: string
): Promise<OnboardingTask> {
  const refNumber = await nextRefNumber("ONBOARDING");

  return repo.create({
    ...data,
    refNumber,
    createdBy,
    status:   "active",
    stage:    data.stage || "documentation",
    dueDate:  data.dueDate || null,
    notes:    data.notes  || null,
  });
}

export async function updateOnboardingTask(
  id: string,
  data: Partial<OnboardingTaskFormData>
): Promise<void> {
  return repo.update(id, data as Partial<OnboardingTask>);
}

export async function deleteOnboardingTask(id: string): Promise<void> {
  return repo.delete(id);
}
