import type { FirestoreRecord } from "@/types/global";
import type { RecruitmentStage } from "@/lib/constants";

export type Candidate = Omit<FirestoreRecord, "status"> & {
  refNumber:        string;
  fullName:         string;
  email:            string | null;
  phone:            string;
  resumeUrl:        string | null;
  jobOpeningId:     string | null;
  jobOpeningTitle:  string | null;
  source:           string;
  status:           RecruitmentStage;
  interviewDate:    string | null;
  interviewerName:  string | null;
  notes:            string | null;
  officeId:         string;
  officeName:       string;
};

export type CandidateFormData = Omit<
  Candidate,
  "id" | "createdAt" | "updatedAt" | "refNumber" | "status" | "resumeUrl"
>;
