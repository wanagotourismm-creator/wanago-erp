import { orderBy } from "firebase/firestore";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { generateRefNumber } from "@/lib/utils/helpers";
import type { JobOpening, JobOpeningFormData } from "@/modules/recruitment/jobs/types";

class JobOpeningRepository extends BaseRepository<JobOpening> {
  constructor() { super(FIRESTORE_COLLECTIONS.JOB_OPENINGS); }
}
const repo = new JobOpeningRepository();

export async function fetchJobOpenings(): Promise<JobOpening[]> {
  return repo.findMany({ constraints: [orderBy("postedDate", "desc")] });
}

export async function fetchJobOpeningById(id: string): Promise<JobOpening | null> {
  return repo.findById(id);
}

export async function createJobOpening(
  data: JobOpeningFormData,
  createdBy: string
): Promise<JobOpening> {
  const existing = await getDocs(collection(db, FIRESTORE_COLLECTIONS.JOB_OPENINGS));
  const ids       = existing.docs.map(d => d.data().refNumber ?? "");
  const refNumber = generateRefNumber("JOB", ids);

  return repo.create({
    ...data,
    refNumber,
    createdBy,
    status:      "active",
    jobStatus:   "open",
    description: data.description  || null,
    requirements: data.requirements || null,
    closingDate: data.closingDate  || null,
  });
}

export async function updateJobOpening(
  id: string,
  data: Partial<JobOpeningFormData & { jobStatus: JobOpening["jobStatus"] }>
): Promise<void> {
  return repo.update(id, data as Partial<JobOpening>);
}

export async function deleteJobOpening(id: string): Promise<void> {
  return repo.delete(id);
}
