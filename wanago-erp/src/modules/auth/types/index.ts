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
