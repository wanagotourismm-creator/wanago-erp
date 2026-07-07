import { z } from "zod";

export const employeeSchema = z.object({
  // Personal
  fullName:          z.string().min(2, "Full name is required"),
  gender:            z.enum(["male", "female", "other"]).optional(),
  dateOfBirth:       z.string().optional().or(z.literal("")),
  mobileNumber:      z.string().min(10, "Enter a valid mobile number"),
  email:             z.string().email("Invalid email").optional().or(z.literal("")),
  address:           z.string().optional().or(z.literal("")),

  // Employment
  department:            z.string().min(1, "Department is required"),
  designation:           z.string().min(1, "Designation is required"),
  reportingManagerId:    z.string().optional().or(z.literal("")),
  employmentType:        z.enum(["full_time", "part_time", "contract", "intern"]),
  dateOfJoining:         z.string().optional().or(z.literal("")),
  probationStatus:       z.enum(["probation", "confirmed"]),
  employeeStatus:        z.enum(["active", "inactive", "terminated", "resigned"]),

  // Financial
  basicSalary:       z.coerce.number().min(0),
  hra:               z.coerce.number().min(0).default(0),
  allowances:        z.coerce.number().min(0).default(0),
  bankAccountNumber: z.string().optional().or(z.literal("")),
  bankName:          z.string().optional().or(z.literal("")),
  ifscCode:          z.string().optional().or(z.literal("")),
  uan:               z.string().optional().or(z.literal("")),
  pfNumber:          z.string().optional().or(z.literal("")),
  panNumber:         z.string().optional().or(z.literal("")),

  // Sales incentives — individually-assigned monthly profit target.
  monthlyProfitTarget: z.coerce.number().min(0).optional().nullable(),

  officeId:   z.string().min(1),
  officeName: z.string().min(1),

  // Explicit link to a login account — fixes/overrides the automatic
  // email-based matching used by fetchEmployeeByUserId.
  userId: z.string().optional().or(z.literal("")),
});

export type EmployeeSchema = z.infer<typeof employeeSchema>;
