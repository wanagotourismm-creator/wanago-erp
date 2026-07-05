import type { Employee } from "@/modules/hrms/shared/types";

export type EmployeeFormData = Omit<
  Employee,
  "id" | "createdAt" | "updatedAt" | "status" | "employeeCode" | "documents" | "profilePictureUrl"
>;
