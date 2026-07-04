import { z } from "zod";

export const candidateSchema = z.object({
  fullName:        z.string().min(2, "Full name is required"),
  email:           z.string().email("Invalid email").optional().or(z.literal("")),
  phone:           z.string().min(10, "Enter a valid phone number"),
  jobOpeningId:    z.string().optional().or(z.literal("")),
  jobOpeningTitle: z.string().optional().or(z.literal("")),
  source:          z.string().min(1, "Source is required"),
  interviewDate:   z.string().optional().or(z.literal("")),
  interviewerName: z.string().optional().or(z.literal("")),
  notes:           z.string().optional().or(z.literal("")),
  officeId:        z.string().min(1),
  officeName:      z.string().min(1),
});

export type CandidateSchema = z.infer<typeof candidateSchema>;
