import { z } from "zod";

export const jobOpeningSchema = z.object({
  title:          z.string().min(2, "Job title is required"),
  department:     z.string().min(1, "Department is required"),
  location:       z.string().min(1, "Location is required"),
  employmentType: z.enum(["full_time", "part_time", "contract", "intern"]),
  description:    z.string().optional().or(z.literal("")),
  requirements:   z.string().optional().or(z.literal("")),
  openings:       z.coerce.number().min(1, "At least 1 opening required"),
  postedDate:     z.string().min(1, "Posted date is required"),
  closingDate:    z.string().optional().or(z.literal("")),
  officeId:       z.string().min(1),
  officeName:     z.string().min(1),
});

export type JobOpeningSchema = z.infer<typeof jobOpeningSchema>;
