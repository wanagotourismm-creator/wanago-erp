import type { FirestoreRecord } from "@/types/global";

export type CompanyGoal = FirestoreRecord & {
  title:       string;
  description: string;
  startDate:   string;
  endDate:     string;
  goalStatus:  "active" | "completed" | "archived";
};

export type ObjectiveStatus = "on_track" | "at_risk" | "off_track" | "done";

export type Objective = FirestoreRecord & {
  goalId:          string;
  title:           string;
  description:     string;
  department:      string;
  ownerId:         string | null;
  ownerName:       string | null;
  dueDate:         string;
  objectiveStatus: ObjectiveStatus;
  progressPercent: number;
};

export type GoalCheckIn = FirestoreRecord & {
  goalId:          string;
  progressPercent: number;
  notes:           string;
  blockers:        string | null;
  postedById:      string;
  postedByName:    string;
};
