import { z } from "zod";

export const payrollRecordSchema = z.object({
  employeeId:   z.string().min(1, "Employee is required"),
  employeeName: z.string().min(1),
  month:        z.coerce.number().min(1).max(12),
  year:         z.coerce.number().min(2020).max(2100),
  basicSalary:  z.coerce.number().min(0),
  hra:          z.coerce.number().min(0),
  allowances:   z.coerce.number().min(0),
  incentives:   z.coerce.number().min(0).default(0),
  bonus:        z.coerce.number().min(0).default(0),
  deductions:   z.coerce.number().min(0).default(0),
  officeId:     z.string().min(1),
});

export type PayrollRecordSchema = z.infer<typeof payrollRecordSchema>;
