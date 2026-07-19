import { describe, it, expect } from "vitest";
import { expenseDocumentSchema } from "./document";

const validExpense = {
  id: "exp_1",
  createdAt: { seconds: 1, nanoseconds: 0 },
  updatedAt: { seconds: 1, nanoseconds: 0 },
  category: "Travel",
  amount: 2500,
  expenseDate: "2026-07-10",
  vendor: "Kerala Cabs",
  description: "Airport transfer",
  receiptUrl: null,
  officeId: "office_1",
  officeName: "Kozhikode",
  notes: null,
  refNumber: "EXP-0001",
  expenseStatus: "pending",
};

describe("expenseDocumentSchema", () => {
  it("accepts a well-formed expense document", () => {
    expect(expenseDocumentSchema.safeParse(validExpense).success).toBe(true);
  });

  it("rejects a document with a non-numeric amount", () => {
    const result = expenseDocumentSchema.safeParse({ ...validExpense, amount: null });
    expect(result.success).toBe(false);
  });

  it("rejects a document missing a description", () => {
    const { description: _description, ...rest } = validExpense;
    expect(expenseDocumentSchema.safeParse(rest).success).toBe(false);
  });
});
