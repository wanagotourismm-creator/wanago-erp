"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchInvoices, fetchInvoiceById, createInvoice, updateInvoice,
  sendInvoiceToCustomer, deleteInvoice,
} from "@/modules/invoices/services/invoice.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
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
      logActivity({
        entityType: "Invoice", entityName: invoice.customerName, action: "created",
        detail: `Created invoice ${invoice.refNumber}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
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

  async function sendInvoice(invoice: Invoice): Promise<{ error: string | null }> {
    try {
      await sendInvoiceToCustomer(invoice);
      // Single-document refresh instead of a full-collection refetch —
      // sendInvoiceToCustomer recomputes status server-side, so we still
      // want fresh truth for this one invoice, just not the whole collection.
      const updated = await fetchInvoiceById(invoice.id);
      if (updated) setInvoices(prev => prev.map(inv => inv.id === invoice.id ? updated : inv));
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to send invoice" };
    }
  }

  // Called after a payment is recorded from the Invoices page (Record
  // Payment shortcut) — applyPaymentToInvoice already wrote the fresh
  // amountPaid/status server-side, this just pulls that single document
  // back into local state instead of a full-collection refetch.
  async function refreshInvoice(id: string): Promise<void> {
    const updated = await fetchInvoiceById(id);
    if (updated) setInvoices(prev => prev.map(inv => inv.id === id ? updated : inv));
  }

  async function removeInvoice(id: string): Promise<{ error: string | null }> {
    try {
      const invoice = invoices.find(i => i.id === id);
      await deleteInvoice(id);
      setInvoices(prev => prev.filter(i => i.id !== id));
      if (invoice) {
        logActivity({
          entityType: "Invoice", entityName: invoice.customerName, action: "deleted",
          detail: `Deleted invoice ${invoice.refNumber}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete invoice" };
    }
  }

  return { invoices, loading, error, load, addInvoice, editInvoice, sendInvoice, removeInvoice, refreshInvoice };
}
