import { z } from "zod";

export const leadSchema = z.object({
  name:           z.string().min(2, "Name must be at least 2 characters"),
  email:          z.string().email("Invalid email").optional().or(z.literal("")),
  phone:          z.string().min(10, "Enter a valid phone number"),
  alternatePhone: z.string().optional().or(z.literal("")),

  destination:    z.string().min(2, "Destination is required"),
  tripType:       z.string().min(1, "Trip type is required"),
  travelDate:     z.string().optional().or(z.literal("")),
  returnDate:     z.string().optional().or(z.literal("")),
  duration:       z.coerce.number().min(1).optional().nullable(),
  pax:            z.coerce.number().min(1, "At least 1 person required"),
  budget:         z.coerce.number().optional().nullable(),

  stage:          z.string().min(1, "Stage is required"),
  priority:       z.string().min(1, "Priority is required"),
  source:         z.string().min(1, "Source is required"),
  assignedTo:     z.string().optional().or(z.literal("")),
  agentName:      z.string().optional().or(z.literal("")),

  officeId:       z.string().min(1),
  officeName:     z.string().min(1),
  notes:          z.string().optional().or(z.literal("")),
});

export type LeadSchema = z.infer<typeof leadSchema>;
