import { z } from "zod";

export const trainingProgramSchema = z.object({
  title:       z.string().min(2, "Title is required"),
  description: z.string().optional().or(z.literal("")),
  category:    z.string().min(1, "Category is required"),
  trainerName: z.string().min(1, "Trainer name is required"),
  mode:        z.enum(["online", "offline", "hybrid"]),
  startDate:   z.string().min(1, "Start date is required"),
  endDate:     z.string().optional().or(z.literal("")),
  officeId:    z.string().min(1),
  officeName:  z.string().min(1),
});

export type TrainingProgramSchema = z.infer<typeof trainingProgramSchema>;
