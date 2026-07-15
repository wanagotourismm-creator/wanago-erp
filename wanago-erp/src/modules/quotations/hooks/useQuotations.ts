"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchQuotations, fetchQuotationById, createQuotation, updateQuotation,
  deleteQuotation, convertQuotationToBooking,
  sendQuotation, markQuotationAccepted, rejectQuotation,
} from "@/modules/quotations/services/quotation.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { Quotation, QuotationFormData } from "@/modules/quotations/types";

export function useQuotations() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const { user } = useAuthStore();

  const load = useCallback(async (filters?: { status?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchQuotations(filters);
      setQuotations(data);
    } catch {
      setError("Failed to load quotations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Re-fetches just the one mutated quotation and splices it back into
  // state, instead of re-fetching the entire collection — same freshness
  // guarantee (the server may have changed fields the caller's partial
  // data doesn't know about, e.g. recomputed totals or a status reset),
  // but O(1) reads instead of O(collection size) on every action.
  async function refreshOne(id: string): Promise<void> {
    const updated = await fetchQuotationById(id);
    if (updated) setQuotations(prev => prev.map(q => q.id === id ? updated : q));
  }

  async function addQuotation(data: QuotationFormData): Promise<{ error: string | null }> {
    try {
      const quotation = await createQuotation(data, user?.uid ?? "");
      setQuotations(prev => [quotation, ...prev]);
      logActivity({
        entityType: "Quotation", entityName: quotation.customerName, action: "created",
        detail: `Created quotation ${quotation.refNumber}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to create quotation" };
    }
  }

  // Totals depend on lineItems/taxRate in ways that are easier to trust
  // from a server refetch than to hand-merge client-side (unlike Invoice's
  // simple balanceDue subtraction) — refreshOne() gets that same fresh
  // server truth for just this one quotation.
  async function editQuotation(
    id: string, data: Partial<QuotationFormData>
  ): Promise<{ error: string | null }> {
    try {
      await updateQuotation(id, data);
      await refreshOne(id);
      return { error: null };
    } catch {
      return { error: "Failed to update quotation" };
    }
  }

  async function removeQuotation(id: string): Promise<{ error: string | null }> {
    try {
      const quotation = quotations.find(q => q.id === id);
      await deleteQuotation(id);
      setQuotations(prev => prev.filter(q => q.id !== id));
      if (quotation) {
        logActivity({
          entityType: "Quotation", entityName: quotation.customerName, action: "deleted",
          detail: `Deleted quotation ${quotation.refNumber}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete quotation" };
    }
  }

  async function convertToBooking(quotation: Quotation): Promise<{ error: string | null }> {
    try {
      await convertQuotationToBooking(quotation, user?.uid ?? "");
      await refreshOne(quotation.id);
      logActivity({
        entityType: "Quotation", entityName: quotation.customerName, action: "status_changed",
        detail: `Converted quotation ${quotation.refNumber} to a booking`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to convert quotation to booking" };
    }
  }

  async function sendToCustomer(quotation: Quotation): Promise<{ error: string | null }> {
    try {
      await sendQuotation(quotation);
      await refreshOne(quotation.id);
      logActivity({
        entityType: "Quotation", entityName: quotation.customerName, action: "status_changed",
        detail: `Sent quotation ${quotation.refNumber} to customer`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to send quotation" };
    }
  }

  async function acceptQuotation(quotation: Quotation): Promise<{ error: string | null }> {
    try {
      await markQuotationAccepted(quotation.id);
      await refreshOne(quotation.id);
      logActivity({
        entityType: "Quotation", entityName: quotation.customerName, action: "status_changed",
        detail: `Marked quotation ${quotation.refNumber} as accepted`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to mark quotation as accepted" };
    }
  }

  async function declineQuotation(quotation: Quotation): Promise<{ error: string | null }> {
    try {
      await rejectQuotation(quotation.id);
      await refreshOne(quotation.id);
      logActivity({
        entityType: "Quotation", entityName: quotation.customerName, action: "status_changed",
        detail: `Marked quotation ${quotation.refNumber} as rejected`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to reject quotation" };
    }
  }

  return {
    quotations, loading, error, load,
    addQuotation, editQuotation, removeQuotation, convertToBooking,
    sendToCustomer, acceptQuotation, declineQuotation,
  };
}
