import type { FirestoreRecord } from "@/types/global";

export type JobStatus = "open" | "closed" | "on_hold";

export type JobOpening = FirestoreRecord & {
  refNumber:      string;
  title:          string;
  department:     string;
  location:       string;
  employmentType: "full_time" | "part_time" | "contract" | "intern";
  description:    string | null;
  requirements:   string | null;
  openings:       number;
  jobStatus:      JobStatus;
  postedDate:     string;
  closingDate:    string | null;
  officeId:       string;
  officeName:     string;
};

export type JobOpeningFormData = Omit<
  JobOpening,
  "id" | "createdAt" | "updatedAt" | "status" | "refNumber" | "jobStatus"
>;
