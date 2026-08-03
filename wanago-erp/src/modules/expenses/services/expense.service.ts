import { where, serverTimestamp, type QueryConstraint } from "firebase/firestore";
import { expenseRepository } from "@/modules/expenses/services/expense.repository";
import { toDate } from "@/lib/utils/helpers";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import { uploadFile } from "@/lib/storage/upload";
import { notifyUser } from "@/lib/notify";
import { fetchUsersByPermission, fetchUserById } from "@/lib/notify-recipients";
import type { Expense, ExpenseFormData } from "@/modules/expenses/types";

// Notifications are best-effort — a failure here must never break the
// expense creation/approval flow itself. Reuses "finance:edit" — the
// permission Finance/Admin already hold, matching who firestore.rules lets
// write expenses (see ExpensesPage.tsx's canManage) — no dedicated
// "expenses:approve" permission exists.
async function notifyExpenseApprovers(expense: Expense): Promise<void> {
  try {
    const approvers = await fetchUsersByPermission("finance:edit");
    await Promise.all(
      approvers.map((u) =>
        notifyUser({
          userId:   u.id,
          email:    u.email,
          title:    `New expense ${expense.refNumber} needs approval`,
          body:     `${expense.category} — ${expense.amount} (${expense.officeName})`,
          link:     "/expenses",
          category: "approval",
        })
      )
    );
  } catch {
    // ignore — notifications must not block expense creation
  }
}

async function notifyExpenseSubmitter(expense: Expense, title: string, body: string): Promise<void> {
  try {
    const creator = await fetchUserById(expense.createdBy);
    if (!creator) return;
    await notifyUser({ userId: creator.id, email: creator.email, title, body, link: "/expenses", category: "approval" });
  } catch {
    // ignore — notifications must not block the approval/rejection flow
  }
}

// Note: sorted client-side (not via Firestore orderBy) so filtered
// queries only need single-field indexes, which Firestore creates
// automatically — no manual composite index deployment required.
export async function fetchExpenses(filters?: {
  officeId?: string;
}): Promise<Expense[]> {
  const constraints: QueryConstraint[] = [];
  if (filters?.officeId) constraints.push(where("officeId", "==", filters.officeId));
  const expenses = await expenseRepository.findMany({ constraints });
  return expenses.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export async function fetchExpenseById(id: string): Promise<Expense | null> {
  return expenseRepository.findById(id);
}

export async function createExpense(
  data: ExpenseFormData,
  createdBy: string
): Promise<Expense> {
  const refNumber = await nextRefNumber("EXPENSE");

  const expense = await expenseRepository.create({
    ...data,
    refNumber,
    createdBy,
    status:        "active",
    expenseStatus: data.expenseStatus || "pending",
    vendor:        data.vendor    || null,
    notes:         data.notes     || null,
    bookingId:     data.bookingId || null,
    bookingRef:    data.bookingRef || null,
    receiptUrl:    null,
    approvedBy:      null,
    approvedAt:      null,
    rejectedBy:      null,
    rejectedAt:      null,
    rejectionReason: null,
  });

  if (expense.expenseStatus === "pending") await notifyExpenseApprovers(expense);

  return expense;
}

export async function updateExpense(
  id: string,
  data: Partial<ExpenseFormData>
): Promise<void> {
  const patch: Partial<Expense> = { ...data };
  if (data.vendor     !== undefined) patch.vendor     = data.vendor     || null;
  if (data.notes      !== undefined) patch.notes      = data.notes      || null;
  if (data.bookingId  !== undefined) patch.bookingId  = data.bookingId  || null;
  if (data.bookingRef !== undefined) patch.bookingRef = data.bookingRef || null;
  return expenseRepository.update(id, patch);
}

export async function deleteExpense(id: string): Promise<void> {
  return expenseRepository.delete(id);
}

// There was previously no real approval workflow here at all — just a
// generic updateExpense({expenseStatus}) call with no trail and no
// notification either way. These give it the same approve/reject +
// notify-both-directions shape every other approval flow in this app has
// (bookings/quotations/invoices).
export async function approveExpense(id: string, approvedBy: string): Promise<void> {
  const existing = await expenseRepository.findById(id);

  await expenseRepository.update(id, {
    expenseStatus: "approved",
    approvedBy,
    approvedAt: serverTimestamp(),
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
  } as Partial<Expense>);

  if (existing) {
    await notifyExpenseSubmitter(
      existing,
      `Expense ${existing.refNumber} approved`,
      `Your ${existing.category} expense (${existing.amount}) was approved and is now awaiting payment.`
    );
  }
}

// reason is optional — ExpenseDetailModal's Reject button currently fires
// immediately with no reason prompt (unlike bookings/quotations, which use
// RejectReasonModal); the trail field is still there for when it does.
export async function rejectExpense(id: string, rejectedBy: string, reason?: string): Promise<void> {
  const existing = await expenseRepository.findById(id);
  const rejectionReason = reason?.trim() || "No reason provided";

  await expenseRepository.update(id, {
    expenseStatus: "rejected",
    rejectedBy,
    rejectedAt: serverTimestamp(),
    rejectionReason,
  } as Partial<Expense>);

  if (existing) {
    await notifyExpenseSubmitter(
      existing,
      `Expense ${existing.refNumber} rejected`,
      `Your ${existing.category} expense (${existing.amount}) was rejected. Reason: ${rejectionReason}`
    );
  }
}

export async function uploadReceipt(expenseId: string, file: File): Promise<string> {
  const url = await uploadFile(`expenses/${expenseId}/receipt-${Date.now()}-${file.name}`, file);
  await expenseRepository.update(expenseId, { receiptUrl: url } as Partial<Expense>);
  return url;
}
