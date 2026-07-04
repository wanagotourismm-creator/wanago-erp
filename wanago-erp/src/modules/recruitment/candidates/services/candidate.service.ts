import { orderBy } from "firebase/firestore";
import { collection, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS, RECRUITMENT_STAGES } from "@/lib/constants";
import { generateRefNumber } from "@/lib/utils/helpers";
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
  const existing = await getDocs(collection(db, FIRESTORE_COLLECTIONS.CANDIDATES));
  const ids       = existing.docs.map(d => d.data().refNumber ?? "");
  const refNumber = generateRefNumber("CANDIDATE", ids);

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
  return repo.update(id, { status: stage } as Partial<Candidate>);
}

export async function deleteCandidate(id: string): Promise<void> {
  return repo.delete(id);
}

export async function uploadResume(candidateId: string, file: File): Promise<string> {
  const storageRef = ref(storage, `candidates/${candidateId}/resume-${Date.now()}-${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await repo.update(candidateId, { resumeUrl: url } as Partial<Candidate>);
  return url;
}
