import { z } from "zod";

export const onboardingTaskSchema = z.object({
  employeeId:   z.string().min(1, "Employee is required"),
  employeeName: z.string().min(1),
  taskLabel:    z.string().min(2, "Task is required"),
  stage:        z.enum(["documentation", "it_setup", "orientation", "complete"]),
  dueDate:      z.string().optional().or(z.literal("")),
  notes:        z.string().optional().or(z.literal("")),
  officeId:     z.string().min(1),
  officeName:   z.string().min(1),
});

export type OnboardingTaskSchema = z.infer<typeof onboardingTaskSchema>;
