import { where, type QueryConstraint } from "firebase/firestore";
import { expenseRepository } from "@/modules/expenses/services/expense.repository";
import { toDate } from "@/lib/utils/helpers";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import { uploadFile } from "@/lib/storage/upload";
import type { Expense, ExpenseFormData } from "@/modules/expenses/types";

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

  return expenseRepository.create({
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
  });
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

export async function uploadReceipt(expenseId: string, file: File): Promise<string> {
  const url = await uploadFile(`expenses/${expenseId}/receipt-${Date.now()}-${file.name}`, file);
  await expenseRepository.update(expenseId, { receiptUrl: url } as Partial<Expense>);
  return url;
}
