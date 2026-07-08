import { where, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { TrainingProgress } from "@/modules/onboarding-training/types";

class TrainingProgressRepository extends BaseRepository<TrainingProgress> {
  constructor() { super(FIRESTORE_COLLECTIONS.ONBOARDING_TRAINING_PROGRESS); }
}
const progressRepo = new TrainingProgressRepository();

function progressDocId(userId: string, moduleId: string): string {
  return `${userId}__${moduleId}`;
}

// Single-field query on userId — matches the codebase's convention of
// avoiding composite indexes (no manual Firestore index deployment needed).
export async function fetchAllProgressForUser(userId: string): Promise<TrainingProgress[]> {
  return progressRepo.findMany({ constraints: [where("userId", "==", userId)] });
}

export async function fetchProgress(userId: string, moduleId: string): Promise<TrainingProgress | null> {
  return progressRepo.findById(progressDocId(userId, moduleId));
}

// Creates the progress doc at its deterministic ID if it doesn't exist yet
// (BaseRepository.create() always auto-generates an ID via addDoc, so this
// bypasses it — same pattern as src/lib/presence.ts's heartbeat doc).
export async function ensureProgress(userId: string, moduleId: string): Promise<TrainingProgress> {
  const existing = await fetchProgress(userId, moduleId);
  if (existing) return existing;

  const id = progressDocId(userId, moduleId);
  await setDoc(doc(db, FIRESTORE_COLLECTIONS.ONBOARDING_TRAINING_PROGRESS, id), {
    userId, moduleId,
    currentStepOrder: 0,
    completedStepIds: [],
    completedAt:       null,
    status:            "active",
    createdBy:         userId,
    createdAt:         serverTimestamp(),
    updatedAt:         serverTimestamp(),
  });
  return (await fetchProgress(userId, moduleId))!;
}

export async function updateProgress(
  userId: string, moduleId: string,
  patch: { currentStepOrder?: number; completedStepIds?: string[]; completed?: boolean }
): Promise<void> {
  // Firestore's updateDoc() rejects explicit `undefined` field values, so
  // only include what was actually passed rather than spreading blanks in.
  const data: Record<string, unknown> = {};
  if (patch.currentStepOrder !== undefined) data.currentStepOrder = patch.currentStepOrder;
  if (patch.completedStepIds !== undefined) data.completedStepIds = patch.completedStepIds;
  if (patch.completed) data.completedAt = serverTimestamp();
  return progressRepo.update(progressDocId(userId, moduleId), data as Partial<TrainingProgress>);
}
