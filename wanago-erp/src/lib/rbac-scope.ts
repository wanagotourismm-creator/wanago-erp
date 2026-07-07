import type { SystemRole } from "@/types/rbac";

// Applied client-side after a fetch (matching this codebase's existing
// convention of filtering in memory rather than adding Firestore query
// constraints, e.g. useHrOverview). Only the `sales` role is restricted;
// every other role (including sales_head, which sees the whole sales team)
// passes through unfiltered. A `sales` user sees a record if it's still
// unassigned (anyone on the team can claim it — first call wins) or if
// it's assigned to them specifically; once assigned to someone else it
// disappears from their view entirely. currentEmployeeId is the logged-in
// user's own Employee.id (resolved via useCurrentEmployee()).
export function scopeByAssignee<T extends { assignedTo?: string | null }>(
  records: T[],
  role: SystemRole,
  currentEmployeeId: string | null
): T[] {
  if (role !== "sales") return records;
  return records.filter((r) => !r.assignedTo || r.assignedTo === currentEmployeeId);
}

// Once a Lead/Customer/Booking has an assignee set, only these roles can
// change it — everyone else (including the assignee themselves) sees it
// locked. Before it's set, anyone can claim it (see scopeByAssignee above).
export function canReassignSalesAgent(role: SystemRole): boolean {
  return role === "admin" || role === "super_admin" || role === "sales_head";
}
