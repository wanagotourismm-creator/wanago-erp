import type { FirestoreRecord } from "@/types/global";

export type TrainingMaterial = {
  id:  string;
  label: string;
  url:  string;
};

export type TrainingProgram = Omit<FirestoreRecord, "status"> & {
  refNumber:    string;
  title:        string;
  description:  string | null;
  category:     string;
  trainerName:  string;
  mode:         "online" | "offline" | "hybrid";
  startDate:    string;
  endDate:      string | null;
  status:       "upcoming" | "ongoing" | "completed" | "cancelled";
  materials:    TrainingMaterial[];
  officeId:     string;
  officeName:   string;
};

export type TrainingProgramFormData = Omit<
  TrainingProgram,
  "id" | "createdAt" | "updatedAt" | "refNumber" | "status" | "materials"
>;
