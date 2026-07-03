// ─────────────────────────────────────────────────
// WANAGO ERP — RBAC / Permission Types
// ─────────────────────────────────────────────────

/** Granular team roles (job titles) */
export type TeamRole =
  | "founder"
  | "ceo"
  | "co_founder"
  | "director"
  | "admin"
  | "branch_manager"
  | "team_lead"
  | "senior_manager"
  | "sales_manager"
  | "operations_manager"
  | "finance_manager"
  | "marketing_manager"
  | "agent";

/** Simplified system roles — used for page/feature gating */
export type SystemRole =
  | "super_admin"
  | "admin"
  | "operations"
  | "marketing"
  | "finance"
  | "hr"
  | "sales"
  | "support";

export type Permission =
  // Leads
  | "leads:view_all"
  | "leads:view_own"
  | "leads:create"
  | "leads:edit"
  | "leads:delete"
  // Customers
  | "customers:view_all"
  | "customers:view_own"
  | "customers:create"
  | "customers:edit"
  | "customers:delete"
  // Bookings
  | "bookings:view_all"
  | "bookings:view_own"
  | "bookings:create"
  | "bookings:edit"
  | "bookings:delete"
  | "bookings:approve"
  // Finance
  | "finance:view"
  | "finance:create"
  | "finance:edit"
  | "finance:export"
  // HRMS
  | "hrms:view_all"
  | "hrms:view_own"
  | "hrms:manage"
  // Admin
  | "admin:settings"
  | "admin:users"
  | "admin:offices"
  // Reports
  | "reports:view"
  | "reports:export";

export type PermissionMap = Record<SystemRole, Permission[]>;

export type PageAccess = Record<SystemRole, string[]>;
