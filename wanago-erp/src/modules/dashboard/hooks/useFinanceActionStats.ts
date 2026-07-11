"use client";

import { useEffect, useState } from "react";
import { fetchInvoices } from "@/modules/invoices/services/invoice.service";
import { fetchExpenses } from "@/modules/expenses/services/expense.service";
import { fetchPayments } from "@/modules/payments/services/payment.service";
import { toDate, formatCurrency } from "@/lib/utils/helpers";
import { INVOICE_STATUS } from "@/lib/constants";

export type PendingApprovalItem = { kind: "invoice" | "expense"; id: string; label: string; amount: number; daysOld: number };

export type FinanceActionStats = {
  pendingInvoiceApprovals: number;
  overdueInvoices: number;
  overdueAmount: number;
  pendingExpenseApprovals: number;
  collectedThisMonth: number;
  oldestPending: PendingApprovalItem[];
};

const EMPTY: FinanceActionStats = {
  pendingInvoiceApprovals: 0, overdueInvoices: 0, overdueAmount: 0,
  pendingExpenseApprovals: 0, collectedThisMonth: 0, oldestPending: [],
};

// Finance's queues are company-wide (not scoped to one employee) — same
// reasoning as HR's dashboard: these are backlogs the whole Finance team is
// responsible for clearing, not a single person's assigned work.
export function useFinanceActionStats() {
  const [stats, setStats] = useState<FinanceActionStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [invoices, expenses, payments] = await Promise.all([
          fetchInvoices(), fetchExpenses(), fetchPayments(),
        ]);
        if (cancelled) return;

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const ageInDays = (d: Date) => Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

        const pendingInvoices = invoices.filter((i) => i.financeApprovalStatus === "pending");
        const overdue = invoices.filter((i) => i.status === INVOICE_STATUS.OVERDUE);
        const pendingExpenses = expenses.filter((e) => e.expenseStatus === "pending");

        const collectedThisMonth = payments
          .filter((p) => {
            const created = toDate(p.createdAt);
            return created && created >= monthStart;
          })
          .reduce((sum, p) => sum + (p.amount ?? 0), 0);

        const oldestPending: PendingApprovalItem[] = [
          ...pendingInvoices.map((i): PendingApprovalItem | null => {
            const created = toDate(i.createdAt);
            if (!created) return null;
            return { kind: "invoice", id: i.id, label: `${i.customerName} — ${formatCurrency(i.totalAmount)}`, amount: i.totalAmount, daysOld: ageInDays(created) };
          }),
          ...pendingExpenses.map((e): PendingApprovalItem | null => {
            const created = toDate(e.createdAt);
            if (!created) return null;
            return { kind: "expense", id: e.id, label: `${e.category} — ${formatCurrency(e.amount)}`, amount: e.amount, daysOld: ageInDays(created) };
          }),
        ].filter((i): i is PendingApprovalItem => i !== null).sort((a, b) => b.daysOld - a.daysOld);

        setStats({
          pendingInvoiceApprovals: pendingInvoices.length,
          overdueInvoices: overdue.length,
          overdueAmount: overdue.reduce((sum, i) => sum + i.balanceDue, 0),
          pendingExpenseApprovals: pendingExpenses.length,
          collectedThisMonth,
          oldestPending: oldestPending.slice(0, 5),
        });
      } catch (e) {
        console.error("[useFinanceActionStats] failed to load — showing zeroed stats:", e);
        if (!cancelled) setStats(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { ...stats, loading };
}
