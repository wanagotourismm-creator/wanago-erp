import { z } from "zod";

export const bookingSchema = z.object({
  customerId:    z.string().min(1, "Customer is required"),
  customerName:  z.string().min(1),
  customerPhone: z.string().min(1),
  leadId:        z.string().optional().nullable(),

  destination:   z.string().min(2, "Destination is required"),
  tripType:      z.string().min(1, "Trip type is required"),
  packageId:     z.string().optional().or(z.literal("")),
  packageName:   z.string().optional().or(z.literal("")),
  travelDate:    z.string().optional().or(z.literal("")),
  returnDate:    z.string().optional().or(z.literal("")),
  pax:           z.coerce.number().min(1, "At least 1 person required"),

  totalAmount:   z.coerce.number().min(0, "Total amount is required"),
  advanceAmount: z.coerce.number().min(0).default(0),

  assignedTo:    z.string().optional().or(z.literal("")),
  agentName:     z.string().optional().or(z.literal("")),

  officeId:      z.string().min(1),
  officeName:    z.string().min(1),
  notes:         z.string().optional().or(z.literal("")),
}).refine((data) => data.advanceAmount <= data.totalAmount, {
  message: "Advance can't exceed the total amount",
  path: ["advanceAmount"],
});

export type BookingSchema = z.infer<typeof bookingSchema>;
