import type { SystemRole } from "@/types/rbac";

// Applied client-side after a fetch (matching this codebase's existing
// convention of filtering in memory rather than adding Firestore query
// constraints, e.g. useHrOverview). Only the `sales` role is restricted to
// its own assigned records — every other role (including the new
// sales_head, which sees the whole sales team) passes through unfiltered.
// currentEmployeeId is the logged-in user's own Employee.id (resolved via
// useCurrentEmployee()) — records assigned before this scoping existed
// have no matching id and simply won't show up for a `sales` user until
// reassigned through the normal edit form.
export function scopeByAssignee<T extends { assignedTo?: string | null }>(
  records: T[],
  role: SystemRole,
  currentEmployeeId: string | null
): T[] {
  if (role !== "sales") return records;
  if (!currentEmployeeId) return [];
  return records.filter((r) => r.assignedTo === currentEmployeeId);
}
