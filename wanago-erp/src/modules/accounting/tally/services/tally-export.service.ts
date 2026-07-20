import { orderBy } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { fetchInvoices } from "@/modules/invoices/services/invoice.service";
import { fetchPayments } from "@/modules/payments/services/payment.service";
import { fetchExpenses } from "@/modules/expenses/services/expense.service";
import { SYSTEM_MAPPING_KEYS } from "@/modules/accounting/tally/types";
import type { Invoice } from "@/modules/invoices/types";
import type { Payment } from "@/modules/payments/types";
import type { Expense } from "@/modules/expenses/types";
import type { TallyMapping, TallyExportLog, TallyExportFormat } from "@/modules/accounting/tally/types";

class TallyExportRepository extends BaseRepository<TallyExportLog> {
  constructor() { super(FIRESTORE_COLLECTIONS.TALLY_EXPORTS); }
}
const exportRepo = new TallyExportRepository();

// ── Data fetch (period filtering happens in-memory — none of
// fetchInvoices/fetchPayments/fetchExpenses take a date range, only
// status/officeId, matching every other module's fetch* convention) ──
export async function fetchExportData(periodStart: string, periodEnd: string): Promise<{
  invoices: Invoice[]; payments: Payment[]; expenses: Expense[];
}> {
  const [allInvoices, allPayments, allExpenses] = await Promise.all([
    fetchInvoices(),
    fetchPayments(),
    fetchExpenses(),
  ]);

  return {
    // Only approved invoices belong in the books — drafts/pending/rejected
    // aren't real sales yet.
    invoices: allInvoices.filter(
      (i) => i.financeApprovalStatus === "approved" && i.issueDate >= periodStart && i.issueDate <= periodEnd
    ),
    payments: allPayments.filter((p) => p.paymentDate >= periodStart && p.paymentDate <= periodEnd),
    // Only actually-paid expenses hit the books — pending/rejected aren't
    // real cash-out yet.
    expenses: allExpenses.filter(
      (e) => e.expenseStatus === "paid" && e.expenseDate >= periodStart && e.expenseDate <= periodEnd
    ),
  };
}

// ── Ledger resolution ───────────────────────────────────────────
export function resolveLedgerName(
  mappings: TallyMapping[], sourceType: TallyMapping["sourceType"], sourceKey: string
): { ledgerName: string; parentGroup: string; unmapped: boolean } {
  const match = mappings.find((m) => m.sourceType === sourceType && m.sourceKey === sourceKey);
  if (match) return { ledgerName: match.tallyLedgerName, parentGroup: match.tallyParentGroup, unmapped: false };
  // Never blocks the export over a missing mapping — falls back to the
  // category name itself under a generic expense group, flagged so the
  // admin knows to add a proper mapping.
  return { ledgerName: sourceKey, parentGroup: "Indirect Expenses", unmapped: true };
}

function system(mappings: TallyMapping[], key: string) {
  return resolveLedgerName(mappings, "system", key);
}

// ── Voucher construction (pure — the money-math and Tally shape live
// here so they're fully unit-testable independent of Firestore/DOM) ──

export type TallyVoucherEntry = { ledgerName: string; parentGroup: string; amount: number; isDebit: boolean };
export type TallyVoucherType = "Sales" | "Receipt" | "Payment";
export type TallyVoucher = {
  type: TallyVoucherType;
  date: string; // YYYYMMDD
  voucherNumber: string;
  partyLedgerName: string;
  narration: string;
  entries: TallyVoucherEntry[];
};

function toTallyDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

// totalAmount is tax-inclusive (see Invoice.taxAmount's own comment) — the
// same back-calculation InvoiceForm.tsx uses, split evenly into CGST+SGST.
// There's no per-customer/office state-code data anywhere in this app, so
// IGST vs CGST/SGST can't be determined — every GST invoice is exported as
// intra-state CGST+SGST. Documented limitation, not a silent bug.
export function computeGstSplit(totalAmount: number, taxRate: number): { taxableAmount: number; cgst: number; sgst: number } {
  const taxAmount = Math.round(totalAmount * (taxRate / (100 + taxRate)) * 100) / 100;
  const half = Math.round((taxAmount / 2) * 100) / 100;
  return { taxableAmount: Math.round((totalAmount - taxAmount) * 100) / 100, cgst: half, sgst: taxAmount - half };
}

function invoiceToVoucher(invoice: Invoice, mappings: TallyMapping[]): TallyVoucher {
  const sales = system(mappings, SYSTEM_MAPPING_KEYS.SALES_ACCOUNT);
  const entries: TallyVoucherEntry[] = [];

  const hasGst = !!invoice.taxRate && invoice.taxRate > 0;
  if (hasGst) {
    const { taxableAmount, cgst, sgst } = computeGstSplit(invoice.totalAmount, invoice.taxRate!);
    entries.push({ ledgerName: sales.ledgerName, parentGroup: sales.parentGroup, amount: taxableAmount, isDebit: false });
    if (cgst > 0) {
      const c = system(mappings, SYSTEM_MAPPING_KEYS.OUTPUT_CGST);
      entries.push({ ledgerName: c.ledgerName, parentGroup: c.parentGroup, amount: cgst, isDebit: false });
    }
    if (sgst > 0) {
      const s = system(mappings, SYSTEM_MAPPING_KEYS.OUTPUT_SGST);
      entries.push({ ledgerName: s.ledgerName, parentGroup: s.parentGroup, amount: sgst, isDebit: false });
    }
  } else {
    entries.push({ ledgerName: sales.ledgerName, parentGroup: sales.parentGroup, amount: invoice.totalAmount, isDebit: false });
  }

  return {
    type: "Sales",
    date: toTallyDate(invoice.issueDate),
    voucherNumber: invoice.refNumber,
    partyLedgerName: invoice.customerName,
    narration: `Invoice ${invoice.refNumber} — ${invoice.customerName}`,
    entries: [
      { ledgerName: invoice.customerName, parentGroup: "Sundry Debtors", amount: invoice.totalAmount, isDebit: true },
      ...entries,
    ],
  };
}

function paymentToVoucher(payment: Payment, mappings: TallyMapping[]): TallyVoucher {
  // Payment has no structured payment-method field to reliably branch on
  // (it's free text), so cash vs bank can't be determined precisely —
  // defaults to Cash, the common case for a small travel business; the
  // ledger name itself is still admin-editable via tallyMappings.
  const isBank = /bank|neft|imps|rtgs|upi|card|cheque|transfer/i.test(payment.paymentMethod);
  const cashOrBank = system(mappings, isBank ? SYSTEM_MAPPING_KEYS.BANK : SYSTEM_MAPPING_KEYS.CASH);

  return {
    type: "Receipt",
    date: toTallyDate(payment.paymentDate),
    voucherNumber: payment.refNumber,
    partyLedgerName: payment.customerName,
    narration: `Payment ${payment.refNumber} — ${payment.customerName}${payment.invoiceRef ? ` (against ${payment.invoiceRef})` : ""}`,
    entries: [
      { ledgerName: cashOrBank.ledgerName, parentGroup: cashOrBank.parentGroup, amount: payment.amount, isDebit: true },
      { ledgerName: payment.customerName, parentGroup: "Sundry Debtors", amount: payment.amount, isDebit: false },
    ],
  };
}

function expenseToVoucher(expense: Expense, mappings: TallyMapping[]): { voucher: TallyVoucher; unmapped: boolean } {
  const expenseLedger = resolveLedgerName(mappings, "expense_category", expense.category);
  // Same reasoning as paymentToVoucher — Expense has no payment-method
  // field either, defaults to Cash.
  const cash = system(mappings, SYSTEM_MAPPING_KEYS.CASH);

  return {
    unmapped: expenseLedger.unmapped,
    voucher: {
      type: "Payment",
      date: toTallyDate(expense.expenseDate),
      voucherNumber: expense.refNumber,
      partyLedgerName: expenseLedger.ledgerName,
      narration: `${expense.category} — ${expense.description}${expense.vendor ? ` (${expense.vendor})` : ""}`,
      entries: [
        { ledgerName: expenseLedger.ledgerName, parentGroup: expenseLedger.parentGroup, amount: expense.amount, isDebit: true },
        { ledgerName: cash.ledgerName, parentGroup: cash.parentGroup, amount: expense.amount, isDebit: false },
      ],
    },
  };
}

export function buildTallyVouchers(
  data: { invoices: Invoice[]; payments: Payment[]; expenses: Expense[] },
  mappings: TallyMapping[]
): { vouchers: TallyVoucher[]; unmappedExpenseCategories: string[] } {
  const vouchers: TallyVoucher[] = [
    ...data.invoices.map((i) => invoiceToVoucher(i, mappings)),
    ...data.payments.map((p) => paymentToVoucher(p, mappings)),
  ];

  const unmappedExpenseCategories = new Set<string>();
  for (const expense of data.expenses) {
    const { voucher, unmapped } = expenseToVoucher(expense, mappings);
    vouchers.push(voucher);
    if (unmapped) unmappedExpenseCategories.add(expense.category);
  }

  return { vouchers, unmappedExpenseCategories: Array.from(unmappedExpenseCategories) };
}

// ── XML / CSV rendering ──────────────────────────────────────────

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Tally's debit/credit convention: a debit entry is ISDEEMEDPOSITIVE=Yes
// with a NEGATIVE amount; a credit entry is ISDEEMEDPOSITIVE=No with a
// POSITIVE amount. Easy to get backwards — kept as one small function so
// it's tested in isolation.
function ledgerEntryXml(entry: TallyVoucherEntry): string {
  const amount = entry.isDebit ? -Math.abs(entry.amount) : Math.abs(entry.amount);
  return `      <ALLLEDGERENTRIES.LIST>
       <LEDGERNAME>${escapeXml(entry.ledgerName)}</LEDGERNAME>
       <ISDEEMEDPOSITIVE>${entry.isDebit ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
       <AMOUNT>${amount.toFixed(2)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>`;
}

function voucherXml(v: TallyVoucher): string {
  return `    <TALLYMESSAGE xmlns:UDF="TallyUDF">
     <VOUCHER VCHTYPE="${v.type}" ACTION="Create">
      <DATE>${v.date}</DATE>
      <VOUCHERTYPENAME>${v.type}</VOUCHERTYPENAME>
      <VOUCHERNUMBER>${escapeXml(v.voucherNumber)}</VOUCHERNUMBER>
      <PARTYLEDGERNAME>${escapeXml(v.partyLedgerName)}</PARTYLEDGERNAME>
      <NARRATION>${escapeXml(v.narration)}</NARRATION>
${v.entries.map(ledgerEntryXml).join("\n")}
     </VOUCHER>
    </TALLYMESSAGE>`;
}

function ledgerMasterXml(name: string, parentGroup: string): string {
  return `    <TALLYMESSAGE xmlns:UDF="TallyUDF">
     <LEDGER NAME="${escapeXml(name)}" ACTION="Create">
      <PARENT>${escapeXml(parentGroup)}</PARENT>
      <ISBILLWISEON>Yes</ISBILLWISEON>
     </LEDGER>
    </TALLYMESSAGE>`;
}

// Only auto-creates party (customer) and expense-category ledgers — never
// the system accounts (Sales/GST/Cash/Bank), which are assumed to already
// exist in Tally with correct GST/rate configuration this app has no way
// to validate. Auto-creating those blind would be guessing at Tally-side
// tax setup.
export function buildTallyXml(vouchers: TallyVoucher[], companyName: string): string {
  const ledgersToCreate = new Map<string, string>();
  for (const v of vouchers) {
    for (const entry of v.entries) {
      if (entry.parentGroup === "Sundry Debtors" || entry.parentGroup === "Indirect Expenses") {
        if (!ledgersToCreate.has(entry.ledgerName)) ledgersToCreate.set(entry.ledgerName, entry.parentGroup);
      }
    }
  }

  const masters = Array.from(ledgersToCreate.entries()).map(([name, group]) => ledgerMasterXml(name, group));
  const voucherBlocks = vouchers.map(voucherXml);

  return `<ENVELOPE>
 <HEADER>
  <TALLYREQUEST>Import Data</TALLYREQUEST>
 </HEADER>
 <BODY>
  <IMPORTDATA>
   <REQUESTDESC>
    <REPORTNAME>Vouchers</REPORTNAME>
    <STATICVARIABLES>
     <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
    </STATICVARIABLES>
   </REQUESTDESC>
   <REQUESTDATA>
${[...masters, ...voucherBlocks].join("\n")}
   </REQUESTDATA>
  </IMPORTDATA>
 </BODY>
</ENVELOPE>`;
}

// A flat, human-readable reconciliation export — NOT a guaranteed
// direct-Tally-import file. Tally's native CSV import needs per-company
// voucher-configuration this app can't blindly match, so this is
// presented in the UI as an Excel/reconciliation aid, not a second
// "Tally-compatible" format.
export function buildTallyCsv(vouchers: TallyVoucher[]): string {
  const header = "Date,Voucher Type,Voucher No,Party,Ledger,Debit,Credit,Narration";
  const rows: string[] = [header];
  for (const v of vouchers) {
    for (const entry of v.entries) {
      const debit  = entry.isDebit  ? entry.amount.toFixed(2) : "";
      const credit = !entry.isDebit ? entry.amount.toFixed(2) : "";
      const cells = [v.date, v.type, v.voucherNumber, v.partyLedgerName, entry.ledgerName, debit, credit, v.narration]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`);
      rows.push(cells.join(","));
    }
  }
  return rows.join("\n");
}

// ── Export log ────────────────────────────────────────────────
export async function logTallyExport(entry: {
  periodStart: string; periodEnd: string; format: TallyExportFormat;
  invoiceCount: number; paymentCount: number; expenseCount: number;
  unmappedExpenseCategories: string[];
  exportedBy: string; exportedByName: string;
}): Promise<void> {
  await exportRepo.create({ ...entry, status: "active", createdBy: entry.exportedBy });
}

export async function fetchTallyExports(): Promise<TallyExportLog[]> {
  return exportRepo.findMany({ constraints: [orderBy("createdAt", "desc")] });
}
