import { describe, it, expect } from "vitest";
import { paymentDocumentSchema } from "./document";

const validPayment = {
  id: "pay_1",
  createdAt: { seconds: 1, nanoseconds: 0 },
  updatedAt: { seconds: 1, nanoseconds: 0 },
  invoiceId: "inv_1",
  invoiceRef: "INV-0001",
  customerId: "cust_1",
  customerName: "Jane Doe",
  amount: 5000,
  paymentMethod: "cash",
  paymentDate: "2026-07-10",
  referenceNumber: null,
  officeId: "office_1",
  officeName: "Kozhikode",
  notes: null,
  refNumber: "PAY-0001",
};

describe("paymentDocumentSchema", () => {
  it("accepts a well-formed payment document", () => {
    expect(paymentDocumentSchema.safeParse(validPayment).success).toBe(true);
  });

  it("rejects a document with a non-numeric amount", () => {
    const result = paymentDocumentSchema.safeParse({ ...validPayment, amount: "5000" });
    expect(result.success).toBe(false);
  });

  it("rejects a document missing customerId", () => {
    const { customerId: _customerId, ...rest } = validPayment;
    expect(paymentDocumentSchema.safeParse(rest).success).toBe(false);
  });
});
