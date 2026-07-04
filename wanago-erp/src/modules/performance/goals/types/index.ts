import type { FirestoreRecord } from "@/types/global";
import type { GoalStatus } from "@/lib/constants";

export type Goal = Omit<FirestoreRecord, "status"> & {
  refNumber:    string;
  employeeId:   string;
  employeeName: string;
  title:        string;
  description:  string | null;
  category:     string;
  period:       string;
  progress:     number;
  status:       GoalStatus;
  dueDate:      string | null;
  officeId:     string;
  officeName:   string;
};

export type GoalFormData = Omit<
  Goal,
  "id" | "createdAt" | "updatedAt" | "refNumber" | "status" | "progress"
>;
