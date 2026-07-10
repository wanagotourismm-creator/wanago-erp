"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchPayments, createPayment, deletePayment } from "@/modules/payments/services/payment.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import { formatCurrency } from "@/lib/utils/helpers";
import type { Payment, PaymentFormData } from "@/modules/payments/types";

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPayments();
      setPayments(data);
    } catch {
      setError("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addPayment(data: PaymentFormData): Promise<{ error: string | null }> {
    try {
      const payment = await createPayment(data, user?.uid ?? "");
      setPayments(prev => [payment, ...prev]);
      logActivity({
        entityType: "Payment", entityName: payment.customerName, action: "created",
        detail: `Recorded payment ${payment.refNumber} (${formatCurrency(payment.amount)})`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to record payment" };
    }
  }

  async function removePayment(id: string): Promise<{ error: string | null }> {
    try {
      const payment = payments.find(p => p.id === id);
      await deletePayment(id);
      setPayments(prev => prev.filter(p => p.id !== id));
      if (payment) {
        logActivity({
          entityType: "Payment", entityName: payment.customerName, action: "deleted",
          detail: `Deleted payment ${payment.refNumber}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete payment" };
    }
  }

  return { payments, loading, error, load, addPayment, removePayment };
}
