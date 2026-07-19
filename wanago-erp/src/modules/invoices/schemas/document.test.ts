import { describe, it, expect } from "vitest";
import { invoiceDocumentSchema } from "./document";

const validInvoice = {
  id: "inv_1",
  createdAt: { seconds: 1, nanoseconds: 0 },
  updatedAt: { seconds: 1, nanoseconds: 0 },
  bookingId: null,
  bookingRef: null,
  customerId: "cust_1",
  customerName: "Jane Doe",
  customerPhone: "9876543210",
  totalAmount: 10000,
  amountPaid: 5000,
  balanceDue: 5000,
  taxRate: null,
  taxAmount: null,
  issueDate: "2026-07-01",
  dueDate: "2026-07-15",
  status: "partial",
  officeId: "office_1",
  officeName: "Kozhikode",
  notes: null,
  refNumber: "INV-0001",
  financeApprovalStatus: "approved",
  financeApprovedBy: "uid_1",
  financeApprovedAt: { seconds: 2, nanoseconds: 0 },
  financeRejectedBy: null,
  financeRejectedAt: null,
  financeRejectionReason: null,
};

describe("invoiceDocumentSchema", () => {
  it("accepts a well-formed invoice document", () => {
    const result = invoiceDocumentSchema.safeParse(validInvoice);
    expect(result.success).toBe(true);
  });

  it("accepts a legitimate document missing optional tax fields", () => {
    const { taxRate: _taxRate, taxAmount: _taxAmount, ...rest } = validInvoice;
    const result = invoiceDocumentSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it("rejects a document with a non-numeric totalAmount", () => {
    const result = invoiceDocumentSchema.safeParse({ ...validInvoice, totalAmount: "10000" });
    expect(result.success).toBe(false);
  });

  it("rejects a document missing a required identity field", () => {
    const { customerId: _customerId, ...rest } = validInvoice;
    const result = invoiceDocumentSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});
