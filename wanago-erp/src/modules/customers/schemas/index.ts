import { z } from "zod";

export const customerSchema = z.object({
  name:           z.string().min(2, "Name must be at least 2 characters"),
  email:          z.string().email("Invalid email").optional().or(z.literal("")),
  phone:          z.string().min(10, "Enter a valid phone number"),
  alternatePhone: z.string().optional().or(z.literal("")),
  dateOfBirth:    z.string().optional().or(z.literal("")),
  anniversary:    z.string().optional().or(z.literal("")),
  gender:         z.enum(["male", "female", "other"]).optional().nullable(),

  city:           z.string().optional().or(z.literal("")),
  state:          z.string().optional().or(z.literal("")),
  country:        z.string().min(1, "Country is required"),
  pincode:        z.string().optional().or(z.literal("")),

  officeId:       z.string().min(1),
  officeName:     z.string().min(1),
  assignedTo:     z.string().optional().or(z.literal("")),
  agentName:      z.string().optional().or(z.literal("")),
  source:         z.string().optional().or(z.literal("")),
  tags:           z.array(z.string()).default([]),
  notes:          z.string().optional().or(z.literal("")),
});

export type CustomerSchema = z.infer<typeof customerSchema>;
