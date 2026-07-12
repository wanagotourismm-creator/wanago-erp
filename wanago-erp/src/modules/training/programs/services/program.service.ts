import { orderBy } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import { uploadFile } from "@/lib/storage/upload";
import type { TrainingProgram, TrainingProgramFormData, TrainingMaterial } from "@/modules/training/programs/types";

class TrainingProgramRepository extends BaseRepository<TrainingProgram> {
  constructor() { super(FIRESTORE_COLLECTIONS.TRAINING_PROGRAMS); }
}
const repo = new TrainingProgramRepository();

export async function fetchTrainingPrograms(): Promise<TrainingProgram[]> {
  return repo.findMany({ constraints: [orderBy("startDate", "desc")] });
}

export async function createTrainingProgram(
  data: TrainingProgramFormData,
  createdBy: string
): Promise<TrainingProgram> {
  const refNumber = await nextRefNumber("TRAINING");

  return repo.create({
    ...data,
    refNumber,
    createdBy,
    status:      "upcoming",
    materials:   [],
    description: data.description || null,
    endDate:     data.endDate      || null,
  });
}

export async function updateTrainingProgram(
  id: string,
  data: Partial<TrainingProgramFormData & { status: TrainingProgram["status"] }>
): Promise<void> {
  return repo.update(id, data as Partial<TrainingProgram>);
}

export async function deleteTrainingProgram(id: string): Promise<void> {
  return repo.delete(id);
}

export async function uploadTrainingMaterial(
  programId: string,
  label: string,
  file: File,
  existingMaterials: TrainingMaterial[]
): Promise<TrainingMaterial[]> {
  const url = await uploadFile(`training/${programId}/${Date.now()}-${file.name}`, file);

  const materials = [...existingMaterials, { id: `${Date.now()}`, label, url }];
  await repo.update(programId, { materials } as Partial<TrainingProgram>);
  return materials;
}

export async function removeTrainingMaterial(
  programId: string,
  materialId: string,
  existingMaterials: TrainingMaterial[]
): Promise<TrainingMaterial[]> {
  const materials = existingMaterials.filter(m => m.id !== materialId);
  await repo.update(programId, { materials } as Partial<TrainingProgram>);
  return materials;
}
