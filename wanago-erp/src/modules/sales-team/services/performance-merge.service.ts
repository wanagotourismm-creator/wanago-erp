import { toDate } from "@/lib/utils/helpers";
import type { Goal } from "@/modules/performance/goals/types";
import type { PerformanceReview } from "@/modules/performance/reviews/types";

// Picks the single most-recently-dated Goal per employeeId — same
// "most-recent-wins" idea as vendor-portal's findApplicableRate, just
// keyed by employeeId instead of serviceName+date. dueDate is optional on
// a Goal, so a missing one falls back to updatedAt for the comparison.
export function pickLatestGoalByEmployee(goals: Goal[]): Map<string, Goal> {
  const latest = new Map<string, Goal>();
  for (const goal of goals) {
    const existing = latest.get(goal.employeeId);
    if (!existing) { latest.set(goal.employeeId, goal); continue; }
    const existingMs = (toDate(existing.dueDate) ?? toDate(existing.updatedAt))?.getTime() ?? 0;
    const goalMs     = (toDate(goal.dueDate)     ?? toDate(goal.updatedAt))?.getTime()     ?? 0;
    if (goalMs > existingMs) latest.set(goal.employeeId, goal);
  }
  return latest;
}

// Same idea for PerformanceReview — reviewDate is always present, so no
// fallback is needed.
export function pickLatestReviewByEmployee(reviews: PerformanceReview[]): Map<string, PerformanceReview> {
  const latest = new Map<string, PerformanceReview>();
  for (const review of reviews) {
    const existing = latest.get(review.employeeId);
    if (!existing || review.reviewDate > existing.reviewDate) {
      latest.set(review.employeeId, review);
    }
  }
  return latest;
}
