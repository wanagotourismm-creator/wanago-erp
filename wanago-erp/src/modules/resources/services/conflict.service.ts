import type { DateRange, ResourceAssignment, ResourceBlackout } from "@/modules/resources/types";

// YYYY-MM-DD strings compare correctly with plain string comparison
// (lexicographic order matches chronological order for this format), so
// no Date parsing is needed anywhere in this file.
export function dateRangesOverlap(a: DateRange, b: DateRange): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

export type ResourceConflict =
  | { type: "assignment"; assignment: ResourceAssignment }
  | { type: "blackout"; blackout: ResourceBlackout };

// The hard-block check an assignment form runs before saving — any
// non-empty result means "don't save," surfaced with the specific
// conflicting assignment/blackout so staff know exactly what's in the way.
// excludeAssignmentId lets an in-place edit skip conflicting with itself.
export function findConflicts(
  resourceId: string,
  range: DateRange,
  assignments: ResourceAssignment[],
  blackouts: ResourceBlackout[],
  excludeAssignmentId?: string
): ResourceConflict[] {
  const conflicts: ResourceConflict[] = [];

  for (const assignment of assignments) {
    if (assignment.resourceId !== resourceId) continue;
    if (assignment.id === excludeAssignmentId) continue;
    if (dateRangesOverlap(range, assignment)) {
      conflicts.push({ type: "assignment", assignment });
    }
  }

  for (const blackout of blackouts) {
    if (blackout.resourceId !== resourceId) continue;
    if (dateRangesOverlap(range, blackout)) {
      conflicts.push({ type: "blackout", blackout });
    }
  }

  return conflicts;
}

function daysBetweenInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
}

// Assigned-days / period-days as a percentage — assignments are clamped to
// the period window so a booking that starts before or ends after the
// period only counts the days actually inside it.
export function computeUtilization(
  resourceId: string, assignments: ResourceAssignment[], period: DateRange
): number {
  const periodDays = daysBetweenInclusive(period.startDate, period.endDate);
  if (periodDays === 0) return 0;

  let assignedDays = 0;
  for (const assignment of assignments) {
    if (assignment.resourceId !== resourceId) continue;
    if (!dateRangesOverlap(assignment, period)) continue;
    const clampedStart = assignment.startDate > period.startDate ? assignment.startDate : period.startDate;
    const clampedEnd = assignment.endDate < period.endDate ? assignment.endDate : period.endDate;
    assignedDays += daysBetweenInclusive(clampedStart, clampedEnd);
  }

  return Math.min(100, (assignedDays / periodDays) * 100);
}
