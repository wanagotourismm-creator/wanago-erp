import { z } from "zod";

export const bookingSchema = z.object({
  leadId:          z.string().optional().or(z.literal("")),
  customerId:      z.string().optional().or(z.literal("")),
  customerName:    z.string().min(2, "Customer name is required"),
  customerPhone:   z.string().min(10, "Valid phone required"),
  customerEmail:   z.string().email("Invalid email").optional().or(z.literal("")),
  pax:             z.coerce.number().min(1, "At least 1 person"),
  destination:     z.string().min(2, "Destination required"),
  tripType:        z.string().min(1, "Trip type required"),
  departureDate:   z.string().min(1, "Departure date required"),
  returnDate:      z.string().min(1, "Return date required"),
  duration:        z.coerce.number().min(1, "Duration required"),
  itinerary:       z.string().optional().or(z.literal("")),
  totalAmount:     z.coerce.number().min(0),
  paidAmount:      z.coerce.number().min(0).default(0),
  balanceDue:      z.coerce.number().min(0).default(0),
  paymentStatus:   z.enum(["paid","partial","unpaid","overdue"]).default("unpaid"),
  bookingStatus:   z.string().min(1, "Status required"),
  officeId:        z.string().min(1),
  officeName:      z.string().min(1),
  assignedTo:      z.string().optional().or(z.literal("")),
  agentName:       z.string().optional().or(z.literal("")),
  supplierId:      z.string().optional().or(z.literal("")),
  supplierName:    z.string().optional().or(z.literal("")),
  notes:           z.string().optional().or(z.literal("")),
  specialRequests: z.string().optional().or(z.literal("")),
});

export type BookingSchema = z.infer<typeof bookingSchema>;
