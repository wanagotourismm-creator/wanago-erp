import { orderBy, doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
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
  const refNumber = await nextRefNumber("JOB");

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

// Called whenever a candidate linked to this opening is marked "joined" —
// previously nothing ever touched `openings`/`jobStatus` on that event, so
// a filled position stayed listed as open (with its original opening
// count) indefinitely until a human noticed and edited it manually. A
// transaction guards against double-decrementing if a candidate is somehow
// marked joined twice.
export async function decrementJobOpening(jobOpeningId: string): Promise<void> {
  const ref = doc(db, FIRESTORE_COLLECTIONS.JOB_OPENINGS, jobOpeningId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const job = snap.data() as JobOpening;
    const openings = Math.max(0, (job.openings ?? 0) - 1);
    tx.update(ref, { openings, jobStatus: openings === 0 ? "closed" : job.jobStatus });
  });
}
