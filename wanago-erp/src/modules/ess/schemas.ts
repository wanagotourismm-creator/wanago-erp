import { z } from "zod";

export const essLeaveApplySchema = z
  .object({
    leaveType: z.enum(["casual", "sick", "earned", "emergency", "wfh"]),
    fromDate:  z.string().min(1, "From date is required"),
    toDate:    z.string().min(1, "To date is required"),
    reason:    z.string().min(3, "Reason is required"),
  })
  .refine((d) => new Date(d.toDate) >= new Date(d.fromDate), {
    message: "To date must be on or after from date",
    path: ["toDate"],
  });

export type EssLeaveApplySchema = z.infer<typeof essLeaveApplySchema>;

export const essRegularizationApplySchema = z.object({
  date:              z.string().min(1, "Date is required"),
  requestedClockIn:  z.string().optional().or(z.literal("")),
  requestedClockOut: z.string().optional().or(z.literal("")),
  reason:            z.string().min(3, "Reason is required"),
});

export type EssRegularizationApplySchema = z.infer<typeof essRegularizationApplySchema>;
