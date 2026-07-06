"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchExpenses, createExpense, updateExpense,
  deleteExpense, uploadReceipt,
} from "@/modules/expenses/services/expense.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { Expense, ExpenseFormData } from "@/modules/expenses/types";

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const { user } = useAuthStore();

  const load = useCallback(async (filters?: { officeId?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExpenses(filters);
      setExpenses(data);
    } catch {
      setError("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addExpense(
    data: ExpenseFormData, receiptFile?: File | null
  ): Promise<{ error: string | null }> {
    try {
      let expense = await createExpense(data, user?.uid ?? "");
      if (receiptFile) {
        const receiptUrl = await uploadReceipt(expense.id, receiptFile);
        expense = { ...expense, receiptUrl };
      }
      setExpenses(prev => [expense, ...prev]);
      logActivity({
        entityType: "Expense", entityName: expense.category, action: "created",
        detail: `Logged expense ${expense.refNumber}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to create expense" };
    }
  }

  async function editExpense(
    id: string, data: Partial<ExpenseFormData>, receiptFile?: File | null
  ): Promise<{ error: string | null }> {
    try {
      await updateExpense(id, data);
      let receiptUrl: string | undefined;
      if (receiptFile) {
        receiptUrl = await uploadReceipt(id, receiptFile);
      }
      setExpenses(prev => prev.map(e => (
        e.id === id ? { ...e, ...data, ...(receiptUrl ? { receiptUrl } : {}) } : e
      )));
      return { error: null };
    } catch {
      return { error: "Failed to update expense" };
    }
  }

  async function changeStatus(
    id: string, expenseStatus: Expense["expenseStatus"]
  ): Promise<{ error: string | null }> {
    try {
      await updateExpense(id, { expenseStatus });
      setExpenses(prev => prev.map(e => (e.id === id ? { ...e, expenseStatus } : e)));
      return { error: null };
    } catch {
      return { error: "Failed to update expense status" };
    }
  }

  async function removeExpense(id: string): Promise<{ error: string | null }> {
    try {
      const expense = expenses.find(e => e.id === id);
      await deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
      if (expense) {
        logActivity({
          entityType: "Expense", entityName: expense.category, action: "deleted",
          detail: `Deleted expense ${expense.refNumber}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete expense" };
    }
  }

  return { expenses, loading, error, load, addExpense, editExpense, changeStatus, removeExpense };
}
