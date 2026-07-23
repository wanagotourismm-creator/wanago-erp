import { describe, it, expect } from "vitest";
import {
  buildTrailingMonthBuckets, bucketRevenueByMonth, computeMovingAverage,
  computeMoMChange, computeYoYChange,
} from "./sales-trend.service";

describe("buildTrailingMonthBuckets", () => {
  it("returns the requested number of buckets, oldest first, ending at the given month", () => {
    const buckets = buildTrailingMonthBuckets(3, new Date("2026-08-15"));
    expect(buckets).toHaveLength(3);
    expect(buckets.map((b) => b.label)).toEqual(["Jun 26", "Jul 26", "Aug 26"]);
  });

  it("rolls over the year boundary correctly", () => {
    const buckets = buildTrailingMonthBuckets(3, new Date("2026-01-15"));
    expect(buckets.map((b) => `${b.label}`)).toEqual(["Nov 25", "Dec 25", "Jan 26"]);
  });
});

describe("bucketRevenueByMonth", () => {
  const buckets = buildTrailingMonthBuckets(2, new Date("2026-08-15"));

  it("sums bookings into the correct month bucket", () => {
    const bookings = [
      { totalAmount: 1000, confirmedAt: new Date("2026-07-05") },
      { totalAmount: 2000, confirmedAt: new Date("2026-07-20") },
      { totalAmount: 500,  confirmedAt: new Date("2026-08-01") },
    ];
    expect(bucketRevenueByMonth(bookings, buckets)).toEqual([3000, 500]);
  });

  it("ignores bookings outside every bucket's month", () => {
    const bookings = [
      { totalAmount: 9999, confirmedAt: new Date("2025-01-01") },
      { totalAmount: 500,  confirmedAt: new Date("2026-08-01") },
    ];
    expect(bucketRevenueByMonth(bookings, buckets)).toEqual([0, 500]);
  });
});

describe("computeMovingAverage", () => {
  it("averages over the available history when there's less than a full window", () => {
    const result = computeMovingAverage([10, 20, 30], 3);
    expect(result).toEqual([10, 15, 20]);
  });

  it("uses a full window once enough history exists", () => {
    const result = computeMovingAverage([10, 20, 30, 40], 3);
    expect(result).toEqual([10, 15, 20, 30]);
  });

  it("handles a window equal to the data length", () => {
    const result = computeMovingAverage([10, 20], 2);
    expect(result).toEqual([10, 15]);
  });
});

describe("computeMoMChange", () => {
  it("computes the % change between the last two values", () => {
    expect(computeMoMChange([100, 150])).toBe(50);
  });

  it("returns null when there's no previous value", () => {
    expect(computeMoMChange([100])).toBeNull();
  });

  it("returns null instead of Infinity when the previous value was zero", () => {
    expect(computeMoMChange([0, 100])).toBeNull();
  });
});

describe("computeYoYChange", () => {
  it("returns null when fewer than 13 buckets exist", () => {
    const values = Array(12).fill(100);
    expect(computeYoYChange(values)).toBeNull();
  });

  it("computes the % change against the same month a year back once 13+ buckets exist", () => {
    const values = [...Array(12).fill(100), 120];
    expect(computeYoYChange(values)).toBe(20);
  });

  it("returns null instead of Infinity when the year-ago value was zero", () => {
    const values = [0, ...Array(11).fill(100), 120];
    expect(computeYoYChange(values)).toBeNull();
  });
});
