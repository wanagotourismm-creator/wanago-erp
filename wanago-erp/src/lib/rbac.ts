import type { Permission, PermissionMap, PageAccess, SystemRole } from "@/types/rbac";
import { SYSTEM_ROLES } from "@/lib/constants";

// ── Permission definitions per role ──────────────────────────
export const PERMISSION_MAP: PermissionMap = {
  super_admin: ["*"] as unknown as Permission[],

  admin: [
    "leads:view_all", "leads:view_own", "leads:create", "leads:edit", "leads:delete",
    "customers:view_all", "customers:view_own", "customers:create", "customers:edit", "customers:delete",
    "bookings:view_all", "bookings:view_own", "bookings:create", "bookings:edit", "bookings:delete", "bookings:approve",
    "finance:view", "finance:create", "finance:edit", "finance:export",
    "hrms:view_all", "hrms:view_own", "hrms:manage",
    "reports:view", "reports:export",
    "admin:settings", "admin:users", "admin:offices",
  ],

  operations: [
    "leads:view_all",
    "customers:view_all",
    "bookings:view_all", "bookings:edit", "bookings:approve",
    "reports:view",
  ],

  finance: [
    "bookings:view_all",
    "finance:view", "finance:create", "finance:edit", "finance:export",
    "reports:view", "reports:export",
  ],

  marketing: [
    "leads:view_all", "leads:view_own", "leads:create", "leads:edit",
    "customers:view_all",
    "reports:view",
  ],

  hr: [
    "hrms:view_all", "hrms:view_own", "hrms:manage",
    "reports:view",
  ],

  sales: [
    "leads:view_own", "leads:create", "leads:edit",
    "customers:view_own", "customers:create",
    "bookings:view_own", "bookings:create",
  ],

  support: [
    "leads:view_own",
    "customers:view_own",
    "bookings:view_own",
  ],
};

// ── Page access by role ───────────────────────────────────────
export const PAGE_ACCESS: PageAccess = {
  super_admin: ["*"],
  admin:       ["*"],
  operations:  ["dashboard", "leads", "customers", "bookings", "operations", "packages", "suppliers"],
  finance:     ["dashboard", "bookings", "invoices", "payments", "expenses", "reports", "hrms-payroll"],
  marketing:   ["dashboard", "leads", "customers", "marketing", "reports"],
  hr:          ["dashboard", "hrms-employees", "hrms-attendance", "hrms-leaves", "hrms-payroll", "recruitment", "performance", "reports"],
  sales:       ["dashboard", "leads", "customers", "bookings", "packages"],
  support:     ["dashboard", "leads", "customers", "bookings"],
};

// ── Dynamic permission overrides ─────────────────────────────
// Admins can customize per-role permissions from the Admin panel.
// When set, these take precedence over the static PERMISSION_MAP
// above (which remains the fallback/default).
let permissionOverrides: PermissionMap | null = null;

export function setPermissionOverrides(map: PermissionMap | null): void {
  permissionOverrides = map;
}

export function getEffectivePermissionMap(): PermissionMap {
  return permissionOverrides ?? PERMISSION_MAP;
}

// ── RBAC utility functions ────────────────────────────────────
export function hasPermission(role: SystemRole, permission: Permission): boolean {
  const perms = getEffectivePermissionMap()[role];
  if (!perms) return false;
  return (perms as string[]).includes("*") || (perms as string[]).includes(permission);
}

export function canAccessPage(role: SystemRole, page: string): boolean {
  const pages = PAGE_ACCESS[role];
  if (!pages) return false;
  return pages.includes("*") || pages.includes(page);
}

export function isAdminRole(role: SystemRole): boolean {
  return role === SYSTEM_ROLES.SUPER_ADMIN || role === SYSTEM_ROLES.ADMIN;
}
