import type { Permission, PermissionMap, PageAccess, SystemRole } from "@/types/rbac";
import { SYSTEM_ROLES } from "@/lib/constants";

// Shared grouping used by both the Roles & Permissions editor and any
// read-only "what can this role access" preview (e.g. when adding a user).
export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  { label: "Leads",     permissions: ["leads:view_all", "leads:view_own", "leads:create", "leads:edit", "leads:delete"] },
  { label: "Customers", permissions: ["customers:view_all", "customers:view_own", "customers:create", "customers:edit", "customers:delete"] },
  { label: "Bookings",  permissions: ["bookings:view_all", "bookings:view_own", "bookings:create", "bookings:edit", "bookings:delete", "bookings:approve"] },
  { label: "Finance",   permissions: ["finance:view", "finance:create", "finance:edit", "finance:export"] },
  { label: "HRMS",      permissions: ["hrms:view_all", "hrms:view_own", "hrms:manage"] },
  { label: "Admin",     permissions: ["admin:settings", "admin:users", "admin:offices"] },
  { label: "Reports",   permissions: ["reports:view", "reports:export"] },
  { label: "WhatsApp Inbox", permissions: ["whatsapp:view_all"] },
];

// ── Permission definitions per role ──────────────────────────
export const PERMISSION_MAP: PermissionMap = {
  super_admin: ["*"] as unknown as Permission[],

  admin: [
    "leads:view_all", "leads:view_own", "leads:create", "leads:edit", "leads:delete",
    "customers:view_all", "customers:view_own", "customers:create", "customers:edit", "customers:delete",
    "bookings:view_all", "bookings:view_own", "bookings:create", "bookings:edit", "bookings:delete", "bookings:approve",
    "bookings:finance_approve", "bookings:ops_approve",
    "quotations:finance_approve", "invoices:finance_approve",
    "finance:view", "finance:create", "finance:edit", "finance:export",
    "hrms:view_all", "hrms:view_own", "hrms:manage",
    "reports:view", "reports:export",
    "admin:settings", "admin:users", "admin:offices",
    "whatsapp:view_all",
  ],

  operations: [
    "leads:view_all",
    "customers:view_all",
    "bookings:view_all", "bookings:edit", "bookings:approve", "bookings:ops_approve",
    "reports:view",
    "whatsapp:view_all",
  ],

  finance: [
    "bookings:view_all", "bookings:finance_approve",
    "quotations:finance_approve", "invoices:finance_approve",
    "finance:view", "finance:create", "finance:edit", "finance:export",
    "reports:view", "reports:export",
  ],

  // Only sees leads/customers assigned to them (or unassigned) — Operations
  // and Sales Head remain the only non-admin roles with full visibility;
  // see roleCanViewAll() in firestore.rules for the matching enforcement.
  marketing: [
    "leads:view_own", "leads:create", "leads:edit",
    "customers:view_own",
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

  // Sees every sales rep's leads/customers/bookings plus the team
  // performance view — everything sales can do, minus the "own only" limit.
  sales_head: [
    "leads:view_all", "leads:create", "leads:edit",
    "customers:view_all", "customers:create",
    "bookings:view_all", "bookings:create",
    "reports:view",
    "whatsapp:view_all",
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
  operations:  ["dashboard", "ess", "team-pulse", "forms", "leads", "customers", "bookings", "operations", "packages", "suppliers", "itineraries", "itinerary-brochures", "ops-approvals", "reviews", "resources", "settings"],
  finance:     ["dashboard", "ess", "team-pulse", "forms", "bookings", "invoices", "payments", "expenses", "reports", "insights", "hrms-payroll", "incentives", "approvals", "accounting-tally", "settings"],
  marketing:   ["dashboard", "ess", "team-pulse", "forms", "leads", "customers", "marketing", "reports", "campaigns", "referral-program", "reviews", "journeys", "whatsapp-inbox", "intake", "settings"],
  hr:          ["dashboard", "ess", "team-pulse", "forms", "hrms-overview", "hrms-employees", "hrms-attendance", "hrms-leaves", "hrms-payroll", "hrms-policies", "recruitment", "performance", "training", "reports", "incentives", "settings"],
  sales:       ["dashboard", "ess", "team-pulse", "forms", "leads", "customers", "bookings", "quotations", "packages", "itineraries", "itinerary-brochures", "whatsapp-inbox", "intake", "settings"],
  sales_head:  ["dashboard", "ess", "team-pulse", "forms", "leads", "customers", "bookings", "quotations", "packages", "itineraries", "itinerary-brochures", "sales-team", "insights", "incentives", "reviews", "whatsapp-inbox", "intake", "settings"],
  support:     ["dashboard", "ess", "team-pulse", "forms", "leads", "customers", "bookings", "whatsapp-inbox", "settings"],
};

// Readable labels for the pages above — used by PageAccessEditor so an
// admin/HR user customizing an employee's access sees "Itinerary Brochures"
// rather than the raw "itinerary-brochures" route slug.
export const PAGE_LABELS: Record<string, string> = {
  "dashboard": "Dashboard",
  "ess": "ESS (My HR)",
  "team-pulse": "Team Pulse",
  "forms": "Forms",
  "leads": "Leads",
  "customers": "Customers",
  "bookings": "Bookings",
  "operations": "Operations",
  "packages": "Packages",
  "suppliers": "Suppliers",
  "itineraries": "Itineraries",
  "itinerary-brochures": "Itinerary Brochures",
  "ops-approvals": "Operations Approvals",
  "settings": "Settings",
  "invoices": "Invoices",
  "payments": "Payments",
  "expenses": "Expenses",
  "reports": "Reports",
  "insights": "Insights",
  "reviews": "Reviews & NPS",
  "journeys": "Marketing Automation",
  "resources": "Resources & Availability",
  "hrms-payroll": "Payroll",
  "incentives": "Incentives",
  "approvals": "Approvals",
  "marketing": "Marketing",
  "campaigns": "Campaigns",
  "referral-program": "Referral Program",
  "whatsapp-inbox": "WhatsApp Inbox",
  "intake": "Intake",
  "hrms-overview": "HR Overview",
  "hrms-employees": "Employees",
  "hrms-attendance": "Attendance",
  "hrms-leaves": "Leaves",
  "hrms-policies": "HR Policies",
  "recruitment": "Recruitment",
  "performance": "Performance",
  "training": "Training",
  "quotations": "Quotations",
  "sales-team": "Sales Team",
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

// Accepts either a bare role (existing behavior, unchanged) or a user-shaped
// object carrying a `customPageAccess` override — a per-employee restriction
// that can only narrow a role's own PAGE_ACCESS list, never grant it a page
// the role doesn't already have. super_admin always gets everything, no
// exceptions, even if a customPageAccess value somehow got set on one.
export function canAccessPage(
  roleOrUser: SystemRole | { systemRole: SystemRole; customPageAccess?: string[] | null },
  page: string
): boolean {
  const role = typeof roleOrUser === "string" ? roleOrUser : roleOrUser.systemRole;
  if (role === SYSTEM_ROLES.SUPER_ADMIN) return true;

  const pages = PAGE_ACCESS[role];
  if (!pages) return false;
  const roleAllows = pages.includes("*") || pages.includes(page);

  const customPageAccess = typeof roleOrUser === "string" ? undefined : roleOrUser.customPageAccess;
  if (customPageAccess) return roleAllows && customPageAccess.includes(page);
  return roleAllows;
}

export function isAdminRole(role: SystemRole): boolean {
  return role === SYSTEM_ROLES.SUPER_ADMIN || role === SYSTEM_ROLES.ADMIN;
}
