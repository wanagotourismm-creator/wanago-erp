import type { FirestoreRecord } from "@/types/global";

export type OnboardingStage = "documentation" | "it_setup" | "orientation" | "complete";

export type OnboardingTask = FirestoreRecord & {
  refNumber:    string;
  employeeId:   string;
  employeeName: string;
  taskLabel:    string;
  stage:        OnboardingStage;
  dueDate:      string | null;
  notes:        string | null;
  officeId:     string;
  officeName:   string;
};

export type OnboardingTaskFormData = Omit<
  OnboardingTask,
  "id" | "createdAt" | "updatedAt" | "createdBy" | "status" | "refNumber"
>;
