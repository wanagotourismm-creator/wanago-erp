import { describe, it, expect, vi } from "vitest";

// journey-engine.server.ts's own Admin-SDK calls are lazy and safe to
// import (getAdminApp() never runs at import time), but it transitively
// imports notify-server.ts -> company-settings.server.ts ->
// company-settings.service.ts, and that last one eagerly initializes the
// client Firebase SDK just to read a DEFAULT_COMPANY_SETTINGS constant
// (the same class of issue Tool 2 fixed directly in review-settings — this
// one lives in pre-existing code outside this feature's scope, so it's
// mocked here instead, same convention as every other *.server.test.ts).
vi.mock("@/lib/firebase/client", () => ({
  db: {},
  auth: { currentUser: null },
}));

import { decideAfterStep, fillTemplate } from "./journey-engine.server";
import type { JourneyStep } from "@/modules/journeys/types";

const NOW = new Date("2026-07-20T00:00:00Z");

describe("fillTemplate", () => {
  it("substitutes {{name}} case-insensitively", () => {
    expect(fillTemplate("Hi {{name}}, how are you {{Name}}?", "Priya")).toBe("Hi Priya, how are you Priya?");
  });

  it("leaves the template unchanged when there's no placeholder", () => {
    expect(fillTemplate("Hello there", "Priya")).toBe("Hello there");
  });
});

describe("decideAfterStep", () => {
  it("chains immediately into the next step when it's also an action", () => {
    const steps: JourneyStep[] = [
      { type: "send_whatsapp", purpose: "p", fallbackBodyTemplate: "hi" },
      { type: "notify_agent", messageTemplate: "follow up" },
    ];
    const decision = decideAfterStep(steps, 0, NOW);
    expect(decision).toEqual({ outcome: "chain", nextIndex: 1 });
  });

  it("defers to a future tick when the next step is a wait", () => {
    const steps: JourneyStep[] = [
      { type: "send_whatsapp", purpose: "p", fallbackBodyTemplate: "hi" },
      { type: "wait", days: 3 },
    ];
    const decision = decideAfterStep(steps, 0, NOW);
    expect(decision.outcome).toBe("wait");
    if (decision.outcome === "wait") {
      expect(decision.nextStepDueAt.getTime()).toBe(NOW.getTime() + 3 * 24 * 60 * 60 * 1000);
    }
  });

  it("completes the run once steps are exhausted", () => {
    const steps: JourneyStep[] = [{ type: "send_whatsapp", purpose: "p", fallbackBodyTemplate: "hi" }];
    const decision = decideAfterStep(steps, 0, NOW);
    expect(decision).toEqual({ outcome: "complete", nextIndex: 1 });
  });
});
