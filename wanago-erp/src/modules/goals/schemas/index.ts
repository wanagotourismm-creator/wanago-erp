import { z } from "zod";

export const companyGoalSchema = z.object({
  title:       z.string().min(2, "Title is required"),
  description: z.string().min(2, "Description is required"),
  startDate:   z.string().min(1, "Start date is required"),
  endDate:     z.string().min(1, "End date is required"),
  goalStatus:  z.enum(["active", "completed", "archived"]),
});
export type CompanyGoalSchema = z.infer<typeof companyGoalSchema>;

export const objectiveSchema = z.object({
  goalId:          z.string().min(1),
  title:           z.string().min(2, "Title is required"),
  description:     z.string().optional().or(z.literal("")),
  department:      z.string().min(1, "Department is required"),
  ownerId:         z.string().optional().or(z.literal("")),
  ownerName:       z.string().optional().or(z.literal("")),
  dueDate:         z.string().min(1, "Due date is required"),
  objectiveStatus: z.enum(["on_track", "at_risk", "off_track", "done"]),
  progressPercent: z.number().min(0).max(100),
});
export type ObjectiveSchema = z.infer<typeof objectiveSchema>;

export const checkInSchema = z.object({
  goalId:          z.string().min(1),
  progressPercent: z.number().min(0).max(100),
  notes:           z.string().min(2, "Add a short note on progress/wins"),
  blockers:        z.string().optional().or(z.literal("")),
});
export type CheckInSchema = z.infer<typeof checkInSchema>;
