import { orderBy } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import { uploadFile } from "@/lib/storage/upload";
import type { TrainingEnrollment, TrainingEnrollmentFormData } from "@/modules/training/enrollments/types";

class EnrollmentRepository extends BaseRepository<TrainingEnrollment> {
  constructor() { super(FIRESTORE_COLLECTIONS.TRAINING_ENROLLMENTS); }
}
const repo = new EnrollmentRepository();

export async function fetchEnrollments(): Promise<TrainingEnrollment[]> {
  return repo.findMany({ constraints: [orderBy("createdAt", "desc")] });
}

export async function createEnrollment(
  data: TrainingEnrollmentFormData,
  createdBy: string
): Promise<TrainingEnrollment> {
  const refNumber = await nextRefNumber("TRAINING");

  return repo.create({
    ...data,
    refNumber,
    createdBy,
    status:         "enrolled",
    completionDate: null,
    certificateUrl: null,
    score:          data.score ?? null,
  });
}

export async function updateEnrollmentStatus(
  id: string,
  status: TrainingEnrollment["status"]
): Promise<void> {
  const patch: Partial<TrainingEnrollment> = { status };
  if (status === "completed") patch.completionDate = new Date().toISOString().slice(0, 10);
  return repo.update(id, patch);
}

export async function deleteEnrollment(id: string): Promise<void> {
  return repo.delete(id);
}

export async function uploadCertificate(enrollmentId: string, file: File): Promise<string> {
  const url = await uploadFile(`training/certificates/${enrollmentId}-${Date.now()}-${file.name}`, file);
  await repo.update(enrollmentId, { certificateUrl: url } as Partial<TrainingEnrollment>);
  return url;
}
