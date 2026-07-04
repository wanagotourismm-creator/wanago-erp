"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchInvoices, createInvoice, updateInvoice,
  markInvoiceSent, deleteInvoice,
} from "@/modules/invoices/services/invoice.service";
import { useAuthStore } from "@/store/auth.store";
import type { Invoice, InvoiceFormData } from "@/modules/invoices/types";

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const { user } = useAuthStore();

  const load = useCallback(async (filters?: { status?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInvoices(filters);
      setInvoices(data);
    } catch {
      setError("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addInvoice(data: InvoiceFormData): Promise<{ error: string | null }> {
    try {
      const invoice = await createInvoice(data, user?.uid ?? "");
      setInvoices(prev => [invoice, ...prev]);
      return { error: null };
    } catch {
      return { error: "Failed to create invoice" };
    }
  }

  async function editInvoice(
    id: string, data: Partial<InvoiceFormData>
  ): Promise<{ error: string | null }> {
    try {
      await updateInvoice(id, data);
      setInvoices(prev => prev.map(i => {
        if (i.id !== id) return i;
        const totalAmount = data.totalAmount ?? i.totalAmount;
        const amountPaid  = data.amountPaid  ?? i.amountPaid;
        return { ...i, ...data, balanceDue: totalAmount - amountPaid };
      }));
      return { error: null };
    } catch {
      return { error: "Failed to update invoice" };
    }
  }

  async function sendInvoice(id: string): Promise<void> {
    await markInvoiceSent(id);
    const updated = await fetchInvoices();
    setInvoices(updated);
  }

  async function removeInvoice(id: string): Promise<{ error: string | null }> {
    try {
      await deleteInvoice(id);
      setInvoices(prev => prev.filter(i => i.id !== id));
      return { error: null };
    } catch {
      return { error: "Failed to delete invoice" };
    }
  }

  return { invoices, loading, error, load, addInvoice, editInvoice, sendInvoice, removeInvoice };
}
