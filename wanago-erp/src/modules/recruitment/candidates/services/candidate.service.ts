import { orderBy } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS, RECRUITMENT_STAGES } from "@/lib/constants";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import { decrementJobOpening } from "@/modules/recruitment/jobs/services/job.service";
import { uploadFile } from "@/lib/storage/upload";
import type { Candidate, CandidateFormData } from "@/modules/recruitment/candidates/types";

class CandidateRepository extends BaseRepository<Candidate> {
  constructor() { super(FIRESTORE_COLLECTIONS.CANDIDATES); }
}
const repo = new CandidateRepository();

export async function fetchCandidates(): Promise<Candidate[]> {
  return repo.findMany({ constraints: [orderBy("createdAt", "desc")] });
}

export async function fetchCandidateById(id: string): Promise<Candidate | null> {
  return repo.findById(id);
}

export async function createCandidate(
  data: CandidateFormData,
  createdBy: string
): Promise<Candidate> {
  const refNumber = await nextRefNumber("CANDIDATE");

  return repo.create({
    ...data,
    refNumber,
    createdBy,
    status:          RECRUITMENT_STAGES.APPLIED,
    email:           data.email           || null,
    resumeUrl:       null,
    jobOpeningId:    data.jobOpeningId     || null,
    jobOpeningTitle: data.jobOpeningTitle  || null,
    interviewDate:   data.interviewDate    || null,
    interviewerName: data.interviewerName  || null,
    notes:           data.notes            || null,
  });
}

export async function updateCandidate(
  id: string,
  data: Partial<CandidateFormData>
): Promise<void> {
  return repo.update(id, data as Partial<Candidate>);
}

export async function updateCandidateStage(id: string, stage: string): Promise<void> {
  // Closing out the linked job opening only happens on the *transition*
  // into "joined" — checking the candidate's current status first stops a
  // re-save (or another stage change bouncing back to "joined") from
  // decrementing the same opening's count twice.
  if (stage === RECRUITMENT_STAGES.JOINED) {
    const candidate = await repo.findById(id);
    if (candidate && candidate.status !== RECRUITMENT_STAGES.JOINED && candidate.jobOpeningId) {
      await decrementJobOpening(candidate.jobOpeningId);
    }
  }
  return repo.update(id, { status: stage } as Partial<Candidate>);
}

export async function deleteCandidate(id: string): Promise<void> {
  return repo.delete(id);
}

export async function uploadResume(candidateId: string, file: File): Promise<string> {
  const url = await uploadFile(`candidates/${candidateId}/resume-${Date.now()}-${file.name}`, file);
  await repo.update(candidateId, { resumeUrl: url } as Partial<Candidate>);
  return url;
}
