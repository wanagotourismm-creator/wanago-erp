import { z } from "zod";

export const leaveRequestSchema = z
  .object({
    employeeId:   z.string().min(1, "Employee is required"),
    employeeName: z.string().min(1),
    leaveType:    z.enum(["casual", "sick", "earned", "emergency", "wfh", "loss_of_pay"]),
    fromDate:     z.string().min(1, "From date is required"),
    toDate:       z.string().min(1, "To date is required"),
    reason:       z.string().min(3, "Reason is required"),
    officeId:     z.string().min(1),
  })
  .refine((d) => new Date(d.toDate) >= new Date(d.fromDate), {
    message: "To date must be on or after from date",
    path: ["toDate"],
  });

export type LeaveRequestSchema = z.infer<typeof leaveRequestSchema>;

export const leaveDecisionSchema = z.object({
  comments: z.string().optional().or(z.literal("")),
});

export type LeaveDecisionSchema = z.infer<typeof leaveDecisionSchema>;
