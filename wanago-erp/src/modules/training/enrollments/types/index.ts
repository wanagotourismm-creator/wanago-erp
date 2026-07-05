import type { FirestoreRecord } from "@/types/global";

export type EnrollmentStatus = "enrolled" | "in_progress" | "completed" | "dropped";

export type TrainingEnrollment = Omit<FirestoreRecord, "status"> & {
  refNumber:           string;
  trainingProgramId:   string;
  trainingProgramTitle: string;
  employeeId:          string;
  employeeName:        string;
  enrollmentDate:       string;
  status:              EnrollmentStatus;
  completionDate:       string | null;
  score:                number | null;
  certificateUrl:       string | null;
  officeId:             string;
  officeName:           string;
};

export type TrainingEnrollmentFormData = Omit<
  TrainingEnrollment,
  "id" | "createdAt" | "updatedAt" | "refNumber" | "status" | "completionDate" | "certificateUrl"
>;
