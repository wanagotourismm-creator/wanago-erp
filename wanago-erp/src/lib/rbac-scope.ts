import { hasPermission } from "@/lib/rbac";
import type { Permission, SystemRole } from "@/types/rbac";

// Applied client-side after a fetch, mirroring this codebase's existing
// convention of filtering in memory rather than adding Firestore query
// constraints (e.g. useHrOverview) — the real enforcement now lives in
// firestore.rules' canViewAssigned()/roleCanViewAll(), which this must stay
// consistent with so the UI never shows something the rules would then
// block. Driven by the same view_all permission the Roles & Permissions
// screen edits, not a hardcoded role check, so toggling a role's view_all
// switch changes what it sees here too, with no code change. A role
// without view_all sees a record if it's still unassigned (anyone can
// claim it — first call wins) or if it's assigned to them specifically;
// once assigned to someone else it disappears from their view entirely.
// currentEmployeeId is the logged-in user's own Employee.id (resolved via
// useCurrentEmployee()).
export function scopeByAssignee<T extends { assignedTo?: string | null }>(
  records: T[],
  role: SystemRole,
  currentEmployeeId: string | null,
  viewAllPermission: Permission
): T[] {
  if (hasPermission(role, viewAllPermission)) return records;
  return records.filter((r) => !r.assignedTo || r.assignedTo === currentEmployeeId);
}

// Once a Lead/Customer/Booking has an assignee set, only these roles can
// change it — everyone else (including the assignee themselves) sees it
// locked. Before it's set, anyone can claim it (see scopeByAssignee above).
export function canReassignSalesAgent(role: SystemRole): boolean {
  return role === "admin" || role === "super_admin" || role === "sales_head";
}
