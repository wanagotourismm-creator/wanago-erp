"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useBookings } from "@/modules/bookings/hooks/useBookings";
import {
  fetchQuotations, approveQuotationOperations, rejectQuotationOperations,
} from "@/modules/quotations/services/quotation.service";
import { BOOKING_STATUS } from "@/lib/constants";
import type { Quotation } from "@/modules/quotations/types";
import type { ApprovalItem } from "@/modules/approvals/types";

// Legacy/pre-feature quotations may not have `financeApprovalStatus` set at
// all — those should still surface in the queue for a first approval rather
// than silently disappearing, so the filter only excludes records
// explicitly marked approved/rejected.
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
  const [loadingQ,   setLoadingQ]   = useState(true);

  const loadQuotations = useCallback(async () => {
    setLoadingQ(true);
    try {
      setQuotations(await fetchQuotations());
    } finally {
      setLoadingQ(false);
    }
  }, []);

  useEffect(() => { loadQuotations(); }, [loadQuotations]);

  const loading = bookingsLoading || loadingQ;

  const reload = useCallback(async () => {
    await Promise.all([loadBookings(), loadQuotations()]);
  }, [loadBookings, loadQuotations]);

  // Invoices no longer have a Finance-approval gate (see invoice.service.ts
  // — status is now driven purely by payment), so the Finance queue is
  // booking-finance only.
  const financeQueue: ApprovalItem[] = useMemo(() => {
    return bookings
      .filter(b => b.status === BOOKING_STATUS.PENDING_FINANCE)
      .map((b): ApprovalItem => ({
        kind: "booking-finance", id: b.id, refNumber: b.refNumber,
        customerName: b.customerName, agentName: b.agentName, amount: b.totalAmount, data: b,
      }));
  }, [bookings]);

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
    item: ApprovalItem & { kind: "quotation" },
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
          await loadQuotations();
          return { error: null };
        } catch {
          return { error: "Failed to approve quotation" };
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
          await loadQuotations();
          return { error: null };
        } catch {
          return { error: "Failed to reject quotation" };
        }
    }
  }

  return { financeQueue, opsQueue, loading, approveItem, rejectItem, reload };
}
