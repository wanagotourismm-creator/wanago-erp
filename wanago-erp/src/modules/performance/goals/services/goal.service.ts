import { orderBy } from "firebase/firestore";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS, GOAL_STATUS } from "@/lib/constants";
import { generateRefNumber } from "@/lib/utils/helpers";
import type { Goal, GoalFormData } from "@/modules/performance/goals/types";

class GoalRepository extends BaseRepository<Goal> {
  constructor() { super(FIRESTORE_COLLECTIONS.PERFORMANCE_GOALS); }
}
const repo = new GoalRepository();

export async function fetchGoals(): Promise<Goal[]> {
  return repo.findMany({ constraints: [orderBy("createdAt", "desc")] });
}

export async function createGoal(
  data: GoalFormData,
  createdBy: string
): Promise<Goal> {
  const existing = await getDocs(collection(db, FIRESTORE_COLLECTIONS.PERFORMANCE_GOALS));
  const ids       = existing.docs.map(d => d.data().refNumber ?? "");
  const refNumber = generateRefNumber("GOAL", ids);

  return repo.create({
    ...data,
    refNumber,
    createdBy,
    status:      GOAL_STATUS.NOT_STARTED,
    progress:    0,
    description: data.description || null,
    dueDate:     data.dueDate     || null,
  });
}

export async function updateGoal(
  id: string,
  data: Partial<GoalFormData>
): Promise<void> {
  return repo.update(id, data as Partial<Goal>);
}

export async function updateGoalProgress(
  id: string,
  progress: number,
  status: Goal["status"]
): Promise<void> {
  return repo.update(id, { progress, status } as Partial<Goal>);
}

export async function deleteGoal(id: string): Promise<void> {
  return repo.delete(id);
}
