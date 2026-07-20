import { describe, it, expect } from "vitest";
import { classifyNpsScore } from "./review-settings.server";
import { DEFAULT_REVIEW_SETTINGS } from "@/modules/reviews/settings/types";

describe("classifyNpsScore", () => {
  it("classifies scores at/above promoterThreshold as promoter", () => {
    expect(classifyNpsScore(9, DEFAULT_REVIEW_SETTINGS)).toBe("promoter");
    expect(classifyNpsScore(10, DEFAULT_REVIEW_SETTINGS)).toBe("promoter");
  });

  it("classifies scores at/below detractorThreshold as detractor", () => {
    expect(classifyNpsScore(6, DEFAULT_REVIEW_SETTINGS)).toBe("detractor");
    expect(classifyNpsScore(0, DEFAULT_REVIEW_SETTINGS)).toBe("detractor");
  });

  it("classifies everything between the thresholds as passive", () => {
    expect(classifyNpsScore(7, DEFAULT_REVIEW_SETTINGS)).toBe("passive");
    expect(classifyNpsScore(8, DEFAULT_REVIEW_SETTINGS)).toBe("passive");
  });

  it("respects custom (admin-configured) thresholds", () => {
    const custom = { ...DEFAULT_REVIEW_SETTINGS, promoterThreshold: 8, detractorThreshold: 4 };
    expect(classifyNpsScore(8, custom)).toBe("promoter");
    expect(classifyNpsScore(5, custom)).toBe("passive");
    expect(classifyNpsScore(4, custom)).toBe("detractor");
  });
});
