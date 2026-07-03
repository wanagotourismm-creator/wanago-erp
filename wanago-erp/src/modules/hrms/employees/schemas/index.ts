import { z } from "zod";

export const employeeSchema = z.object({
  fullName:         z.string().min(2, "Full name required"),
  email:            z.string().email("Valid email required"),
  phone:            z.string().min(10, "Valid phone required"),
  gender:           z.enum(["male","female","other"]).nullable().optional(),
  dateOfBirth:      z.string().optional().or(z.literal("")),
  address:          z.string().optional().or(z.literal("")),
  city:             z.string().optional().or(z.literal("")),
  state:            z.string().optional().or(z.literal("")),

  department:       z.string().min(1, "Department required"),
  designation:      z.string().min(1, "Designation required"),
  reportingManager: z.string().optional().or(z.literal("")),
  employmentType:   z.enum(["full_time","part_time","contract","intern","probation"]),
  dateOfJoining:    z.string().min(1, "Date of joining required"),
  probationStatus:  z.enum(["confirmed","probation","extended"]).default("probation"),
  employeeStatus:   z.enum(["active","inactive","terminated","resigned","on_leave"]).default("active"),
  officeId:         z.string().min(1),
  officeName:       z.string().min(1),
  userId:           z.string().optional().or(z.literal("")),

  basicSalary:      z.coerce.number().min(0).default(0),
  hra:              z.coerce.number().min(0).default(0),
  allowances:       z.coerce.number().min(0).default(0),
  uan:              z.string().optional().or(z.literal("")),
  pfNumber:         z.string().optional().or(z.literal("")),
  panNumber:        z.string().optional().or(z.literal("")),
  bankName:         z.string().optional().or(z.literal("")),
  accountNumber:    z.string().optional().or(z.literal("")),
  ifscCode:         z.string().optional().or(z.literal("")),
  notes:            z.string().optional().or(z.literal("")),
});

export type EmployeeSchema = z.infer<typeof employeeSchema>;
