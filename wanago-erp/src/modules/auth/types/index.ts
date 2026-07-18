import type { SystemRole, TeamRole } from "@/types/rbac";

export type UserProfile = {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  phone: string | null;
  systemRole: SystemRole;
  teamRole: TeamRole;
  // Denormalized from the linked Employee record (see
  // employee.service.ts's syncEmployeeIdOnUser) so Firestore security
  // rules can resolve "which employee is this signed-in uid" without a
  // client-supplied claim. Null for accounts with no linked employee yet.
  employeeId?: string | null;
  officeId: string;
  officeName: string;
  department: string;
  isActive: boolean;
  createdAt: unknown;
  updatedAt: unknown;
  createdBy: string;
  status: string;
  lastLoginAt: unknown | null;
};

export type LoginFormData = {
  email: string;
  password: string;
};

export type ForgotPasswordFormData = {
  email: string;
};

export type AuthError = {
  code: string;
  message: string;
};
