import { describe, it, expect, vi } from "vitest";

// reviews.service.ts also exports Firestore-touching functions
// (scheduleReviewRequest etc.) that eagerly initialize the Firebase app at
// import time — mocked the same way dashboard.service.test.ts does so the
// pure compute functions under test here can be imported safely.
vi.mock("@/lib/firebase/client", () => ({
  db: {},
  auth: { currentUser: null },
}));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
}));

import {
  computeNpsTrend,
  computeResponseRate,
  computeNpsSplit,
  computeNpsByGroup,
} from "./reviews.service";
import type { NpsResponse, ReviewRequest } from "@/modules/reviews/types";

function response(overrides: Partial<NpsResponse>): NpsResponse {
  return {
    id: "r1", createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "active",
    reviewRequestId: "rr1", bookingId: "b1", customerId: "c1", customerName: "Jane",
    score: 8, comment: null, category: "passive",
    destination: "Wayanad", agentName: "Agent A", officeId: "off1", officeName: "Kozhikode",
    ticketId: null,
    ...overrides,
  };
}

function request(overrides: Partial<ReviewRequest>): ReviewRequest {
  return {
    id: "rr1", createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "active",
    bookingId: "b1", bookingRefNumber: "WGO-1001",
    customerId: "c1", customerName: "Jane", customerPhone: "9876543210", customerEmail: null,
    destination: "Wayanad", assignedTo: null, agentName: null, officeId: "off1", officeName: "Kozhikode",
    token: "tok123", scheduledFor: new Date(), sentAt: null, sentChannels: null, respondedAt: null,
    ...overrides,
  };
}

describe("computeNpsTrend", () => {
  it("buckets responses by year+month within a rolling 12-month window", () => {
    const now = new Date("2026-07-20T00:00:00Z");
    const responses = [
      response({ score: 10, createdAt: new Date("2026-07-05T00:00:00Z") }),
      response({ score: 6,  createdAt: new Date("2026-07-15T00:00:00Z") }),
      response({ score: 4,  createdAt: new Date("2025-07-15T00:00:00Z") }), // same month name, previous year — must not merge
    ];
    const trend = computeNpsTrend(responses, now);
    const julyThisYear = trend.find(t => t.month === "Jul 26");
    expect(julyThisYear?.avgScore).toBeCloseTo(8, 5);
    expect(julyThisYear?.count).toBe(2);
  });

  it("returns null avgScore (not 0) for months with no responses", () => {
    const trend = computeNpsTrend([], new Date("2026-07-20T00:00:00Z"));
    expect(trend).toHaveLength(12);
    expect(trend.every(t => t.avgScore === null && t.count === 0)).toBe(true);
  });
});

describe("computeResponseRate", () => {
  it("computes responded / sent as a percentage, ignoring never-sent requests", () => {
    const requests = [
      request({ id: "1", sentAt: new Date(), respondedAt: new Date() }),
      request({ id: "2", sentAt: new Date(), respondedAt: null }),
      request({ id: "3", sentAt: null, respondedAt: null }), // not yet sent — excluded from denominator
    ];
    expect(computeResponseRate(requests)).toBeCloseTo(50, 5);
  });

  it("returns 0 when nothing has been sent yet", () => {
    expect(computeResponseRate([request({ sentAt: null })])).toBe(0);
  });
});

describe("computeNpsSplit", () => {
  it("counts responses per category", () => {
    const responses = [
      response({ category: "promoter" }),
      response({ category: "promoter" }),
      response({ category: "passive" }),
      response({ category: "detractor" }),
    ];
    expect(computeNpsSplit(responses)).toEqual({ promoter: 2, passive: 1, detractor: 1 });
  });
});

describe("computeNpsByGroup", () => {
  it("groups by destination with per-group average and split", () => {
    const responses = [
      response({ destination: "Wayanad", score: 10, category: "promoter" }),
      response({ destination: "Wayanad", score: 4,  category: "detractor" }),
      response({ destination: "Goa",     score: 8,  category: "passive" }),
    ];
    const rows = computeNpsByGroup(responses, "destination");
    const wayanad = rows.find(r => r.key === "Wayanad");
    expect(wayanad).toMatchObject({ count: 2, promoter: 1, detractor: 1, passive: 0 });
    expect(wayanad?.avgScore).toBeCloseTo(7, 5);
  });

  it("falls back to 'Unassigned' when agentName is null", () => {
    const responses = [response({ agentName: null, score: 5 })];
    const rows = computeNpsByGroup(responses, "agentName");
    expect(rows).toEqual([{ key: "Unassigned", count: 1, avgScore: 5, promoter: 0, passive: 1, detractor: 0 }]);
  });

  it("sorts groups by response count descending", () => {
    const responses = [
      response({ destination: "A" }),
      response({ destination: "B" }),
      response({ destination: "B" }),
    ];
    const rows = computeNpsByGroup(responses, "destination");
    expect(rows.map(r => r.key)).toEqual(["B", "A"]);
  });
});
