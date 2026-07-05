import { z } from "zod";

export const trainingEnrollmentSchema = z.object({
  trainingProgramId:    z.string().min(1, "Training program is required"),
  trainingProgramTitle: z.string().min(1),
  employeeId:           z.string().min(1, "Employee is required"),
  employeeName:         z.string().min(1),
  enrollmentDate:       z.string().min(1, "Enrollment date is required"),
  score:                z.coerce.number().optional().nullable(),
  officeId:             z.string().min(1),
  officeName:           z.string().min(1),
});

export type TrainingEnrollmentSchema = z.infer<typeof trainingEnrollmentSchema>;
