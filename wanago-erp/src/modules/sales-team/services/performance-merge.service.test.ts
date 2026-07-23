import { describe, it, expect } from "vitest";
import { pickLatestGoalByEmployee, pickLatestReviewByEmployee } from "./performance-merge.service";
import type { Goal } from "@/modules/performance/goals/types";
import type { PerformanceReview } from "@/modules/performance/reviews/types";

function goal(overrides: Partial<Goal>): Goal {
  return {
    id: "g1", createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), createdBy: "u1",
    refNumber: "GOAL-1", employeeId: "emp1", employeeName: "Jane Doe",
    title: "Close 10 deals", description: null, category: "Sales", period: "Q3 2026",
    progress: 50, status: "in_progress", dueDate: "2026-09-30",
    officeId: "off1", officeName: "Head Office",
    ...overrides,
  };
}

function review(overrides: Partial<PerformanceReview>): PerformanceReview {
  return {
    id: "r1", createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), createdBy: "u1",
    refNumber: "REV-1", employeeId: "emp1", employeeName: "Jane Doe",
    reviewType: "quarterly", period: "Q2 2026", reviewerId: "mgr1", reviewerName: "Manager",
    rating: "meets_expectations", strengths: null, areasForImprovement: null, comments: null,
    reviewDate: "2026-06-30", status: "submitted",
    officeId: "off1", officeName: "Head Office",
    ...overrides,
  };
}

describe("pickLatestGoalByEmployee", () => {
  it("returns an empty map for an empty list", () => {
    expect(pickLatestGoalByEmployee([]).size).toBe(0);
  });

  it("keeps the only goal for a single-goal employee", () => {
    const g = goal({ id: "g1" });
    const result = pickLatestGoalByEmployee([g]);
    expect(result.get("emp1")?.id).toBe("g1");
  });

  it("picks the goal with the latest dueDate when an employee has multiple", () => {
    const older = goal({ id: "older", dueDate: "2026-06-30" });
    const newer = goal({ id: "newer", dueDate: "2026-09-30" });
    const result = pickLatestGoalByEmployee([older, newer]);
    expect(result.get("emp1")?.id).toBe("newer");
  });

  it("keeps each employee's own latest goal independently", () => {
    const a = goal({ id: "a", employeeId: "emp1", dueDate: "2026-06-30" });
    const b = goal({ id: "b", employeeId: "emp2", dueDate: "2026-03-31" });
    const result = pickLatestGoalByEmployee([a, b]);
    expect(result.get("emp1")?.id).toBe("a");
    expect(result.get("emp2")?.id).toBe("b");
  });

  it("falls back to updatedAt when dueDate is null", () => {
    const noDate = goal({ id: "no-date", dueDate: null, updatedAt: new Date("2026-08-01") });
    const withDate = goal({ id: "with-date", dueDate: "2026-05-01" });
    const result = pickLatestGoalByEmployee([withDate, noDate]);
    expect(result.get("emp1")?.id).toBe("no-date");
  });
});

describe("pickLatestReviewByEmployee", () => {
  it("returns an empty map for an empty list", () => {
    expect(pickLatestReviewByEmployee([]).size).toBe(0);
  });

  it("picks the review with the latest reviewDate", () => {
    const older = review({ id: "older", reviewDate: "2026-03-31" });
    const newer = review({ id: "newer", reviewDate: "2026-06-30" });
    const result = pickLatestReviewByEmployee([older, newer]);
    expect(result.get("emp1")?.id).toBe("newer");
  });

  it("keeps each employee's own latest review independently", () => {
    const a = review({ id: "a", employeeId: "emp1", reviewDate: "2026-06-30" });
    const b = review({ id: "b", employeeId: "emp2", reviewDate: "2026-03-31" });
    const result = pickLatestReviewByEmployee([a, b]);
    expect(result.get("emp1")?.id).toBe("a");
    expect(result.get("emp2")?.id).toBe("b");
  });
});
