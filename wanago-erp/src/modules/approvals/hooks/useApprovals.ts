"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useBookings } from "@/modules/bookings/hooks/useBookings";
import {
  fetchQuotations, approveQuotationOperations, rejectQuotationOperations,
} from "@/modules/quotations/services/quotation.service";
import {
  fetchInvoices, approveInvoiceFinance, rejectInvoiceFinance,
} from "@/modules/invoices/services/invoice.service";
import { BOOKING_STATUS } from "@/lib/constants";
import type { Quotation } from "@/modules/quotations/types";
import type { Invoice } from "@/modules/invoices/types";
import type { ApprovalItem } from "@/modules/approvals/types";

// Legacy/pre-feature quotations and invoices may not have
// `financeApprovalStatus` set at all — those should still surface in the
// queue for a first approval rather than silently disappearing, so the
// filter only excludes records explicitly marked approved/rejected. Shared
// by invoices (Finance queue) and quotations (Operations queue) below.
function needsApproval(status: string | undefined): boolean {
  return status !== "approved" && status !== "rejected";
}

export function useApprovals() {
  const {
    bookings,
    loading: bookingsLoading,
    load: loadBookings,
    approveFinance,
    approveOperations,
    rejectFinance,
    rejectOperations,
  } = useBookings();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices,   setInvoices]   = useState<Invoice[]>([]);
  const [loadingQI,  setLoadingQI]  = useState(true);

  const loadQuotationsAndInvoices = useCallback(async () => {
    setLoadingQI(true);
    try {
      const [q, i] = await Promise.all([fetchQuotations(), fetchInvoices()]);
      setQuotations(q);
      setInvoices(i);
    } finally {
      setLoadingQI(false);
    }
  }, []);

  useEffect(() => { loadQuotationsAndInvoices(); }, [loadQuotationsAndInvoices]);

  const loading = bookingsLoading || loadingQI;

  const reload = useCallback(async () => {
    await Promise.all([loadBookings(), loadQuotationsAndInvoices()]);
  }, [loadBookings, loadQuotationsAndInvoices]);

  const financeQueue: ApprovalItem[] = useMemo(() => {
    const bookingItems: ApprovalItem[] = bookings
      .filter(b => b.status === BOOKING_STATUS.PENDING_FINANCE)
      .map(b => ({
        kind: "booking-finance", id: b.id, refNumber: b.refNumber,
        customerName: b.customerName, agentName: b.agentName, amount: b.totalAmount, data: b,
      }));

    const invoiceItems: ApprovalItem[] = invoices
      .filter(inv => needsApproval(inv.financeApprovalStatus))
      .map(inv => ({
        kind: "invoice", id: inv.id, refNumber: inv.refNumber,
        customerName: inv.customerName, agentName: null, amount: inv.totalAmount, data: inv,
      }));

    return [...bookingItems, ...invoiceItems];
  }, [bookings, invoices]);

  const opsQueue: ApprovalItem[] = useMemo(() => {
    const bookingItems: ApprovalItem[] = bookings
      .filter(b => b.status === BOOKING_STATUS.OPS_PENDING)
      .map(b => ({
        kind: "booking-ops", id: b.id, refNumber: b.refNumber,
        customerName: b.customerName, agentName: b.agentName, amount: b.totalAmount, data: b,
      }));

    // Quotation approval moved from Finance to Operations — see
    // quotation.service.ts's notifyOpsApprovers / approveQuotationOperations.
    const quotationItems: ApprovalItem[] = quotations
      .filter(q => needsApproval(q.financeApprovalStatus))
      .map(q => ({
        kind: "quotation", id: q.id, refNumber: q.refNumber,
        customerName: q.customerName, agentName: null, amount: q.totalAmount, data: q,
      }));

    return [...bookingItems, ...quotationItems];
  }, [bookings, quotations]);

  // Overloaded so each call site gets the right "extra" argument type for
  // its item kind: payment verification for booking-finance, profit amount
  // for booking-ops, approvedBy for quotation/invoice (whose service
  // functions — unlike the booking hook's — take approvedBy explicitly).
  async function approveItem(
    item: ApprovalItem & { kind: "booking-finance" },
    paymentVerification: "full" | "partial"
  ): Promise<{ error: string | null }>;
  async function approveItem(
    item: ApprovalItem & { kind: "booking-ops" },
    profitAmount: number
  ): Promise<{ error: string | null }>;
  async function approveItem(
    item: ApprovalItem & { kind: "quotation" | "invoice" },
    approvedBy: string
  ): Promise<{ error: string | null }>;
  async function approveItem(
    item: ApprovalItem,
    extra: string | number
  ): Promise<{ error: string | null }> {
    switch (item.kind) {
      case "booking-finance":
        return approveFinance(item.id, extra as "full" | "partial");
      case "booking-ops":
        return approveOperations(item.id, extra as number);
      case "quotation":
        try {
          await approveQuotationOperations(item.id, extra as string);
          await loadQuotationsAndInvoices();
          return { error: null };
        } catch {
          return { error: "Failed to approve quotation" };
        }
      case "invoice":
        try {
          await approveInvoiceFinance(item.id, extra as string);
          await loadQuotationsAndInvoices();
          return { error: null };
        } catch {
          return { error: "Failed to approve invoice" };
        }
    }
  }

  async function rejectItem(
    item: ApprovalItem, rejectedBy: string, reason: string
  ): Promise<{ error: string | null }> {
    switch (item.kind) {
      case "booking-finance":
        return rejectFinance(item.id, rejectedBy, reason);
      case "booking-ops":
        return rejectOperations(item.id, rejectedBy, reason);
      case "quotation":
        try {
          await rejectQuotationOperations(item.id, rejectedBy, reason);
          await loadQuotationsAndInvoices();
          return { error: null };
        } catch {
          return { error: "Failed to reject quotation" };
        }
      case "invoice":
        try {
          await rejectInvoiceFinance(item.id, rejectedBy, reason);
          await loadQuotationsAndInvoices();
          return { error: null };
        } catch {
          return { error: "Failed to reject invoice" };
        }
    }
  }

  return { financeQueue, opsQueue, loading, approveItem, rejectItem, reload };
}
