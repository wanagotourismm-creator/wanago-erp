import { describe, it, expect } from "vitest";
import { computeTripProfitability } from "./trip-profitability.service";

describe("computeTripProfitability", () => {
  it("treats a null packageCostPrice as zero cost", () => {
    const result = computeTripProfitability({ totalAmount: 50000, packageCostPrice: null, linkedExpenseAmounts: [] });
    expect(result).toEqual({ revenue: 50000, packageCost: 0, extraExpensesCost: 0, computedProfit: 50000 });
  });

  it("subtracts the package cost when no expenses are linked", () => {
    const result = computeTripProfitability({ totalAmount: 50000, packageCostPrice: 35000, linkedExpenseAmounts: [] });
    expect(result).toEqual({ revenue: 50000, packageCost: 35000, extraExpensesCost: 0, computedProfit: 15000 });
  });

  it("sums multiple linked expenses and subtracts them too", () => {
    const result = computeTripProfitability({ totalAmount: 50000, packageCostPrice: 35000, linkedExpenseAmounts: [1000, 2500, 500] });
    expect(result).toEqual({ revenue: 50000, packageCost: 35000, extraExpensesCost: 4000, computedProfit: 11000 });
  });

  it("allows a negative computed profit when costs exceed revenue", () => {
    const result = computeTripProfitability({ totalAmount: 20000, packageCostPrice: 18000, linkedExpenseAmounts: [5000] });
    expect(result.computedProfit).toBe(-3000);
  });
});
