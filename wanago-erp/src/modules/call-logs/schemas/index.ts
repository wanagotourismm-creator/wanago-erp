import { z } from "zod";

export const callLogSchema = z.object({
  leadId:      z.string().optional().nullable(),
  customerId:  z.string().optional().nullable(),
  contactName: z.string().min(1, "Contact name is required"),
  phone:       z.string().min(1, "Phone number is required"),

  callMethod: z.enum(["phone", "whatsapp"]),
  direction:  z.enum(["outbound", "inbound"]),
  outcome:    z.enum(["connected", "no_answer", "busy", "wrong_number"]),
  durationMinutes: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(0).optional().nullable()
  ),
  notes: z.string().optional().or(z.literal("")),

  followUpNeeded: z.boolean().default(false),
  followUpDate:   z.string().optional().or(z.literal("")),
});

export type CallLogSchema = z.infer<typeof callLogSchema>;
