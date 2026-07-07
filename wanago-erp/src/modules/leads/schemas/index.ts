import { z } from "zod";

export const leadSchema = z.object({
  name:           z.string().min(2, "Name must be at least 2 characters"),
  email:          z.string().email("Invalid email").optional().or(z.literal("")),
  phone:          z.string().min(10, "Enter a valid phone number"),
  alternatePhone: z.string().optional().or(z.literal("")),

  // Only Name, Phone & Destination are required at initial capture — the
  // rest is filled in later by the sales agent after their pitch call.
  destination:    z.string().min(2, "Destination is required"),
  tripType:       z.string().optional().or(z.literal("")),
  travelDate:     z.string().optional().or(z.literal("")),
  returnDate:     z.string().optional().or(z.literal("")),
  duration:       z.coerce.number().min(1).optional().nullable(),
  pax:            z.preprocess(
                    (v) => (v === "" || v === null || v === undefined ? undefined : v),
                    z.coerce.number().min(1, "At least 1 person required").optional().nullable()
                  ),
  budget:         z.coerce.number().optional().nullable(),

  stage:          z.string().optional().or(z.literal("")),
  priority:       z.string().optional().or(z.literal("")),
  source:         z.string().optional().or(z.literal("")),
  assignedTo:     z.string().optional().or(z.literal("")),
  agentName:      z.string().optional().or(z.literal("")),
  isSelfGenerated: z.boolean().optional(),

  officeId:       z.string().min(1),
  officeName:     z.string().min(1),
  notes:          z.string().optional().or(z.literal("")),
});

export type LeadSchema = z.infer<typeof leadSchema>;
