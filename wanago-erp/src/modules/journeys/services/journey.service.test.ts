import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/firebase/client", () => ({
  db: {},
  auth: { currentUser: null },
}));

const { getDocsMock } = vi.hoisted(() => ({ getDocsMock: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: getDocsMock,
  getDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  startAfter: vi.fn(),
  serverTimestamp: vi.fn(),
  onSnapshot: vi.fn(),
  doc: vi.fn(),
}));

vi.mock("@/modules/customers/services/customer.service", () => ({
  fetchCustomerById: vi.fn().mockResolvedValue({ id: "c1", email: "jane@example.com", marketingOptOut: false }),
}));

import { createJourneyRunsForTrigger } from "./journey.service";
import { fetchCustomerById } from "@/modules/customers/services/customer.service";

function snapOf(docs: unknown[]) {
  return { docs: docs.map((data, i) => ({ id: `doc${i}`, data: () => data })) };
}

const ACTIVE_JOURNEY = {
  id: "j1", createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "active",
  name: "Test Journey", isActive: true, trigger: { type: "quote_sent" }, steps: [{ type: "wait", days: 1 }],
  campaignId: null, enteredCount: 0, sentCount: 0, repliedCount: 0, convertedCount: 0, revenueTotal: 0,
};

describe("createJourneyRunsForTrigger", () => {
  beforeEach(() => {
    getDocsMock.mockClear();
  });

  it("creates no runs when no journey matches the trigger type", async () => {
    getDocsMock.mockResolvedValueOnce(snapOf([{ ...ACTIVE_JOURNEY, trigger: { type: "trip_completed" } }]));
    await createJourneyRunsForTrigger("quote_sent", {
      id: "q1", customerId: "c1", customerName: "Jane", customerPhone: "9876543210", createdBy: "u1",
    });
    // Only the initial fetchJourneys() call should have happened — no
    // existing-run lookup, since nothing matched.
    expect(getDocsMock).toHaveBeenCalledTimes(1);
  });

  it("does not enter a journey when the customer has opted out", async () => {
    vi.mocked(fetchCustomerById).mockResolvedValueOnce({ id: "c1", email: null, marketingOptOut: true } as never);
    getDocsMock.mockResolvedValueOnce(snapOf([ACTIVE_JOURNEY]));
    await createJourneyRunsForTrigger("quote_sent", {
      id: "q1", customerId: "c1", customerName: "Jane", customerPhone: "9876543210", createdBy: "u1",
    });
    // fetchJourneys() + the opt-out check via fetchCustomerById — but no
    // second getDocs call for an existing-run lookup, since it bails out
    // before ever reaching that idempotency check.
    expect(getDocsMock).toHaveBeenCalledTimes(1);
  });

  it("skips journeys that are inactive", async () => {
    getDocsMock.mockResolvedValueOnce(snapOf([{ ...ACTIVE_JOURNEY, isActive: false }]));
    await createJourneyRunsForTrigger("quote_sent", {
      id: "q1", customerId: "c1", customerName: "Jane", customerPhone: "9876543210", createdBy: "u1",
    });
    expect(getDocsMock).toHaveBeenCalledTimes(1);
  });
});
