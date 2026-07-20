import { describe, it, expect, vi } from "vitest";

// tally-export.service.ts also exports Firestore-touching functions
// (fetchExportData, logTallyExport, etc.) that transitively import
// @/lib/firebase/client, which eagerly initializes Firebase at import
// time — mocked the same way dashboard.service.test.ts/reviews.service.test.ts do.
vi.mock("@/lib/firebase/client", () => ({
  db: {},
  auth: { currentUser: null },
}));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
}));

import {
  resolveLedgerName,
  computeGstSplit,
  buildTallyVouchers,
  buildTallyXml,
  buildTallyCsv,
} from "./tally-export.service";
import { SYSTEM_MAPPING_KEYS } from "@/modules/accounting/tally/types";
import type { TallyMapping } from "@/modules/accounting/tally/types";
import type { Invoice } from "@/modules/invoices/types";
import type { Payment } from "@/modules/payments/types";
import type { Expense } from "@/modules/expenses/types";

function mapping(overrides: Partial<TallyMapping>): TallyMapping {
  return {
    id: "m1", createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "active",
    sourceType: "expense_category", sourceKey: "Travel",
    tallyLedgerName: "Travel Expenses", tallyParentGroup: "Indirect Expenses",
    ...overrides,
  };
}

const SYSTEM_MAPPINGS: TallyMapping[] = [
  mapping({ id: "s1", sourceType: "system", sourceKey: SYSTEM_MAPPING_KEYS.SALES_ACCOUNT, tallyLedgerName: "Sales Account", tallyParentGroup: "Sales Accounts" }),
  mapping({ id: "s2", sourceType: "system", sourceKey: SYSTEM_MAPPING_KEYS.OUTPUT_CGST, tallyLedgerName: "Output CGST", tallyParentGroup: "Duties & Taxes" }),
  mapping({ id: "s3", sourceType: "system", sourceKey: SYSTEM_MAPPING_KEYS.OUTPUT_SGST, tallyLedgerName: "Output SGST", tallyParentGroup: "Duties & Taxes" }),
  mapping({ id: "s4", sourceType: "system", sourceKey: SYSTEM_MAPPING_KEYS.CASH, tallyLedgerName: "Cash", tallyParentGroup: "Cash-in-Hand" }),
  mapping({ id: "s5", sourceType: "system", sourceKey: SYSTEM_MAPPING_KEYS.BANK, tallyLedgerName: "Bank", tallyParentGroup: "Bank Accounts" }),
];

function invoice(overrides: Partial<Invoice>): Invoice {
  return {
    id: "inv1", createdAt: new Date(), updatedAt: new Date(), createdBy: "u1",
    bookingId: null, bookingRef: null,
    customerId: "c1", customerName: "Jane Doe", customerPhone: "9876543210",
    totalAmount: 11800, amountPaid: 0, balanceDue: 11800,
    taxRate: 18, taxAmount: 1800,
    issueDate: "2026-07-10", dueDate: null,
    status: "sent",
    officeId: "off1", officeName: "Kozhikode",
    notes: null, refNumber: "INV-1001",
    financeApprovalStatus: "approved", financeApprovedBy: "u1", financeApprovedAt: new Date(),
    financeRejectedBy: null, financeRejectedAt: null, financeRejectionReason: null,
    ...overrides,
  };
}

function payment(overrides: Partial<Payment>): Payment {
  return {
    id: "pay1", createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "active",
    invoiceId: "inv1", invoiceRef: "INV-1001",
    customerId: "c1", customerName: "Jane Doe",
    amount: 5000, paymentMethod: "Cash", paymentDate: "2026-07-12",
    referenceNumber: null, officeId: "off1", officeName: "Kozhikode",
    notes: null, refNumber: "PAY-1001",
    ...overrides,
  };
}

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: "exp1", createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "active",
    category: "Travel", amount: 2000, expenseDate: "2026-07-11",
    vendor: "Uber", description: "Airport pickup", receiptUrl: null,
    officeId: "off1", officeName: "Kozhikode",
    notes: null, refNumber: "EXP-1001", expenseStatus: "paid",
    ...overrides,
  };
}

describe("resolveLedgerName", () => {
  it("returns the mapped ledger when one exists", () => {
    const result = resolveLedgerName([mapping({})], "expense_category", "Travel");
    expect(result).toEqual({ ledgerName: "Travel Expenses", parentGroup: "Indirect Expenses", unmapped: false });
  });

  it("falls back to the raw category name, flagged unmapped, when no mapping exists", () => {
    const result = resolveLedgerName([], "expense_category", "Office Supplies");
    expect(result).toEqual({ ledgerName: "Office Supplies", parentGroup: "Indirect Expenses", unmapped: true });
  });
});

describe("computeGstSplit", () => {
  it("back-calculates tax from a tax-inclusive total and splits evenly into CGST/SGST", () => {
    // 11800 inclusive of 18% => taxable 10000, tax 1800, CGST/SGST 900 each
    const result = computeGstSplit(11800, 18);
    expect(result.taxableAmount).toBeCloseTo(10000, 2);
    expect(result.cgst).toBeCloseTo(900, 2);
    expect(result.sgst).toBeCloseTo(900, 2);
  });

  it("assigns the odd paisa to sgst so cgst+sgst always equals the total tax exactly", () => {
    const result = computeGstSplit(1005, 5); // taxAmount = 1005*(5/105) = 47.857... -> 47.86
    expect(result.cgst + result.sgst).toBeCloseTo(1005 - result.taxableAmount, 2);
  });
});

describe("buildTallyVouchers", () => {
  it("builds a Sales voucher from an invoice with the party debited and Sales+GST credited", () => {
    const { vouchers } = buildTallyVouchers({ invoices: [invoice({})], payments: [], expenses: [] }, SYSTEM_MAPPINGS);
    expect(vouchers).toHaveLength(1);
    const v = vouchers[0];
    expect(v.type).toBe("Sales");
    expect(v.partyLedgerName).toBe("Jane Doe");
    const party = v.entries.find(e => e.ledgerName === "Jane Doe")!;
    expect(party.isDebit).toBe(true);
    expect(party.amount).toBe(11800);
    const sales = v.entries.find(e => e.ledgerName === "Sales Account")!;
    expect(sales.isDebit).toBe(false);
    expect(sales.amount).toBeCloseTo(10000, 2);
    const cgst = v.entries.find(e => e.ledgerName === "Output CGST")!;
    expect(cgst.amount).toBeCloseTo(900, 2);
    // Debits must equal credits
    const debitTotal = v.entries.filter(e => e.isDebit).reduce((s, e) => s + e.amount, 0);
    const creditTotal = v.entries.filter(e => !e.isDebit).reduce((s, e) => s + e.amount, 0);
    expect(debitTotal).toBeCloseTo(creditTotal, 2);
  });

  it("builds a Sales voucher with no GST entries when the invoice has no tax", () => {
    const { vouchers } = buildTallyVouchers({ invoices: [invoice({ taxRate: null, taxAmount: null, totalAmount: 5000 })], payments: [], expenses: [] }, SYSTEM_MAPPINGS);
    const v = vouchers[0];
    expect(v.entries.some(e => e.ledgerName.includes("CGST"))).toBe(false);
    expect(v.entries.find(e => e.ledgerName === "Sales Account")?.amount).toBe(5000);
  });

  it("builds a Receipt voucher from a payment with cash/bank debited and party credited", () => {
    const { vouchers } = buildTallyVouchers({ invoices: [], payments: [payment({})], expenses: [] }, SYSTEM_MAPPINGS);
    const v = vouchers[0];
    expect(v.type).toBe("Receipt");
    const cash = v.entries.find(e => e.ledgerName === "Cash")!;
    expect(cash.isDebit).toBe(true);
    const party = v.entries.find(e => e.ledgerName === "Jane Doe")!;
    expect(party.isDebit).toBe(false);
  });

  it("routes a bank-like payment method to the Bank ledger instead of Cash", () => {
    const { vouchers } = buildTallyVouchers({ invoices: [], payments: [payment({ paymentMethod: "UPI" })], expenses: [] }, SYSTEM_MAPPINGS);
    expect(vouchers[0].entries.some(e => e.ledgerName === "Bank")).toBe(true);
  });

  it("builds a Payment voucher from an expense, mapped category resolves to its ledger", () => {
    const { vouchers, unmappedExpenseCategories } = buildTallyVouchers(
      { invoices: [], payments: [], expenses: [expense({})] },
      [...SYSTEM_MAPPINGS, mapping({})]
    );
    const v = vouchers[0];
    expect(v.type).toBe("Payment");
    expect(v.partyLedgerName).toBe("Travel Expenses");
    expect(unmappedExpenseCategories).toEqual([]);
  });

  it("flags an unmapped expense category and falls back to its raw name", () => {
    const { unmappedExpenseCategories } = buildTallyVouchers(
      { invoices: [], payments: [], expenses: [expense({ category: "Marketing" })] },
      SYSTEM_MAPPINGS
    );
    expect(unmappedExpenseCategories).toEqual(["Marketing"]);
  });
});

describe("buildTallyXml", () => {
  it("uses the Tally debit/credit convention (Yes+negative for debit, No+positive for credit)", () => {
    const { vouchers } = buildTallyVouchers({ invoices: [invoice({ taxRate: null, taxAmount: null })], payments: [], expenses: [] }, SYSTEM_MAPPINGS);
    const xml = buildTallyXml(vouchers, "Wanago Tours & Travels");
    // Party is the debit entry
    expect(xml).toMatch(/<LEDGERNAME>Jane Doe<\/LEDGERNAME>\s*<ISDEEMEDPOSITIVE>Yes<\/ISDEEMEDPOSITIVE>\s*<AMOUNT>-11800\.00<\/AMOUNT>/);
    // Sales is the credit entry
    expect(xml).toMatch(/<LEDGERNAME>Sales Account<\/LEDGERNAME>\s*<ISDEEMEDPOSITIVE>No<\/ISDEEMEDPOSITIVE>\s*<AMOUNT>11800\.00<\/AMOUNT>/);
  });

  it("creates a party ledger master but not a system-account master", () => {
    const { vouchers } = buildTallyVouchers({ invoices: [invoice({})], payments: [], expenses: [] }, SYSTEM_MAPPINGS);
    const xml = buildTallyXml(vouchers, "Wanago Tours & Travels");
    expect(xml).toContain('<LEDGER NAME="Jane Doe" ACTION="Create">');
    expect(xml).not.toContain('<LEDGER NAME="Sales Account" ACTION="Create">');
  });

  it("escapes XML-special characters in names/narration", () => {
    const { vouchers } = buildTallyVouchers(
      { invoices: [invoice({ customerName: "R&D <Travels>" })], payments: [], expenses: [] },
      SYSTEM_MAPPINGS
    );
    const xml = buildTallyXml(vouchers, "Co");
    expect(xml).toContain("R&amp;D &lt;Travels&gt;");
    expect(xml).not.toContain("R&D <Travels>");
  });
});

describe("buildTallyCsv", () => {
  it("emits one row per ledger entry with debit/credit in separate columns", () => {
    const { vouchers } = buildTallyVouchers({ invoices: [], payments: [payment({})], expenses: [] }, SYSTEM_MAPPINGS);
    const csv = buildTallyCsv(vouchers);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Date,Voucher Type,Voucher No,Party,Ledger,Debit,Credit,Narration");
    expect(lines).toHaveLength(3); // header + 2 entries
    expect(lines[1]).toContain('"5000.00"'); // debit column populated
  });
});
