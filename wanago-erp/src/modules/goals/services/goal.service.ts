import { orderBy, where } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { CompanyGoal, Objective, GoalCheckIn } from "@/modules/goals/types";
import type { CompanyGoalSchema, ObjectiveSchema, CheckInSchema } from "@/modules/goals/schemas";

class GoalRepository extends BaseRepository<CompanyGoal> {
  constructor() { super(FIRESTORE_COLLECTIONS.COMPANY_GOALS); }
}
class ObjectiveRepository extends BaseRepository<Objective> {
  constructor() { super(FIRESTORE_COLLECTIONS.OBJECTIVES); }
}
class CheckInRepository extends BaseRepository<GoalCheckIn> {
  constructor() { super(FIRESTORE_COLLECTIONS.GOAL_CHECKINS); }
}

const goalRepo = new GoalRepository();
const objectiveRepo = new ObjectiveRepository();
const checkInRepo = new CheckInRepository();

export async function fetchGoals(): Promise<CompanyGoal[]> {
  return goalRepo.findMany({ constraints: [orderBy("startDate", "desc")] });
}

export async function createGoal(data: CompanyGoalSchema, createdBy: string): Promise<CompanyGoal> {
  return goalRepo.create({ ...data, createdBy, status: "active" });
}

export async function updateGoal(id: string, data: Partial<CompanyGoalSchema>): Promise<void> {
  return goalRepo.update(id, data);
}

export async function deleteGoal(id: string): Promise<void> {
  return goalRepo.delete(id);
}

export async function fetchObjectivesByGoal(goalId: string): Promise<Objective[]> {
  return objectiveRepo.findMany({ constraints: [where("goalId", "==", goalId), orderBy("createdAt", "desc")] });
}

// Cross-goal lookup (unlike fetchObjectivesByGoal above) — used by the
// Sales Performance Hub to roll up every Sales-department objective
// regardless of which CompanyGoal phase it belongs to.
export async function fetchObjectivesByDepartment(department: string): Promise<Objective[]> {
  return objectiveRepo.findMany({ constraints: [where("department", "==", department), orderBy("createdAt", "desc")] });
}

export async function createObjective(data: ObjectiveSchema, createdBy: string): Promise<Objective> {
  return objectiveRepo.create({
    ...data,
    description: data.description || "",
    ownerId:     data.ownerId || null,
    ownerName:   data.ownerName || null,
    status:      "active",
    createdBy,
  });
}

export async function updateObjective(id: string, data: Partial<ObjectiveSchema>): Promise<void> {
  const patch: Partial<Objective> = { ...data };
  if (data.ownerId !== undefined) patch.ownerId = data.ownerId || null;
  if (data.ownerName !== undefined) patch.ownerName = data.ownerName || null;
  return objectiveRepo.update(id, patch);
}

export async function deleteObjective(id: string): Promise<void> {
  return objectiveRepo.delete(id);
}

export async function fetchCheckInsByGoal(goalId: string): Promise<GoalCheckIn[]> {
  return checkInRepo.findMany({ constraints: [where("goalId", "==", goalId), orderBy("createdAt", "desc")] });
}

export async function createCheckIn(data: CheckInSchema, postedById: string, postedByName: string): Promise<GoalCheckIn> {
  return checkInRepo.create({
    ...data,
    blockers: data.blockers || null,
    postedById,
    postedByName,
    status: "active",
    createdBy: postedById,
  });
}
