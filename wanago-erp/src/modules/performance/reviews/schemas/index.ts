import { z } from "zod";

export const performanceReviewSchema = z.object({
  employeeId:          z.string().min(1, "Employee is required"),
  employeeName:        z.string().min(1),
  reviewType:          z.enum(["quarterly", "annual"]),
  period:              z.string().min(1, "Period is required"),
  reviewerId:          z.string().min(1),
  reviewerName:        z.string().min(1),
  rating:              z.enum(["outstanding", "exceeds_expectations", "meets_expectations", "needs_improvement"]),
  strengths:           z.string().optional().or(z.literal("")),
  areasForImprovement: z.string().optional().or(z.literal("")),
  comments:            z.string().optional().or(z.literal("")),
  reviewDate:          z.string().min(1, "Review date is required"),
  officeId:            z.string().min(1),
  officeName:          z.string().min(1),
});

export type PerformanceReviewSchema = z.infer<typeof performanceReviewSchema>;
