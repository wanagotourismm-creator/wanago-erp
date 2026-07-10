import { z } from "zod";

export const attendanceRecordSchema = z.object({
  employeeId:   z.string().min(1, "Employee is required"),
  employeeName: z.string().min(1),
  date:         z.string().min(1, "Date is required"),
  status:       z.enum(["present", "absent", "half_day", "leave", "wfh", "holiday"]),
  clockIn:      z.string().optional().or(z.literal("")),
  clockOut:     z.string().optional().or(z.literal("")),
  notes:        z.string().optional().or(z.literal("")),
  officeId:     z.string().min(1),
  breakStartTime: z.string().nullable().optional(),
  breakMinutes:   z.number().optional(),
  clockInLat:     z.number().nullable().optional(),
  clockInLng:     z.number().nullable().optional(),
  withinGeofence: z.boolean().nullable().optional(),
  clockOutLat:       z.number().nullable().optional(),
  clockOutLng:       z.number().nullable().optional(),
  withinGeofenceOut: z.boolean().nullable().optional(),
});

export type AttendanceRecordSchema = z.infer<typeof attendanceRecordSchema>;
