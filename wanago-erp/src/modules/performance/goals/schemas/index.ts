import { z } from "zod";

export const goalSchema = z.object({
  employeeId:   z.string().min(1, "Employee is required"),
  employeeName: z.string().min(1),
  title:        z.string().min(2, "Goal title is required"),
  description:  z.string().optional().or(z.literal("")),
  category:     z.string().min(1, "Category is required"),
  period:       z.string().min(1, "Period is required"),
  dueDate:      z.string().optional().or(z.literal("")),
  officeId:     z.string().min(1),
  officeName:   z.string().min(1),
});

export type GoalSchema = z.infer<typeof goalSchema>;
