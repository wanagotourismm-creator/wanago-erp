import { z } from "zod";

export const regularizationRequestSchema = z.object({
  employeeId:        z.string().min(1, "Employee is required"),
  employeeName:      z.string().min(1),
  date:              z.string().min(1, "Date is required"),
  requestedClockIn:  z.string().optional().or(z.literal("")),
  requestedClockOut: z.string().optional().or(z.literal("")),
  reason:            z.string().min(3, "Reason is required"),
  officeId:          z.string().min(1),
});

export type RegularizationRequestSchema = z.infer<typeof regularizationRequestSchema>;
