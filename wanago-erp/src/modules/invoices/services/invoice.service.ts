import { where, type QueryConstraint } from "firebase/firestore";
import { collection, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { invoiceRepository } from "@/modules/invoices/services/invoice.repository";
import { FIRESTORE_COLLECTIONS, INVOICE_STATUS, type InvoiceStatus } from "@/lib/constants";
import { generateRefNumber, toDate } from "@/lib/utils/helpers";
import type { Invoice, InvoiceFormData } from "@/modules/invoices/types";

function computeStatus(
  prevStatus: InvoiceStatus | undefined,
  totalAmount: number,
  amountPaid: number,
  dueDate: string | null
): InvoiceStatus {
  if (prevStatus === INVOICE_STATUS.DRAFT) return INVOICE_STATUS.DRAFT;
  if (totalAmount > 0 && amountPaid >= totalAmount) return INVOICE_STATUS.PAID;
  if (dueDate && new Date(dueDate) < new Date() && amountPaid < totalAmount) return INVOICE_STATUS.OVERDUE;
  if (amountPaid > 0) return INVOICE_STATUS.PARTIAL;
  return INVOICE_STATUS.UNPAID;
}

// Note: sorted client-side (not via Firestore orderBy) so filtered
// queries only need single-field indexes, which Firestore creates
// automatically — no manual composite index deployment required.
export async function fetchInvoices(filters?: {
  status?:   string;
  officeId?: string;
}): Promise<Invoice[]> {
  const constraints: QueryConstraint[] = [];
  if (filters?.status)   constraints.push(where("status",   "==", filters.status));
  if (filters?.officeId) constraints.push(where("officeId", "==", filters.officeId));
  const invoices = await invoiceRepository.findMany({ constraints });
  return invoices.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export async function fetchInvoiceById(id: string): Promise<Invoice | null> {
  return invoiceRepository.findById(id);
}

export async function createInvoice(
  data: InvoiceFormData,
  createdBy: string
): Promise<Invoice> {
  const existing = await getDocs(collection(db, FIRESTORE_COLLECTIONS.INVOICES));
  const ids       = existing.docs.map(d => d.data().refNumber ?? "");
  const refNumber = generateRefNumber("INVOICE", ids);
  const dueDate   = data.dueDate || null;

  return invoiceRepository.create({
    ...data,
    refNumber,
    createdBy,
    dueDate,
    balanceDue: data.totalAmount - data.amountPaid,
    status:     computeStatus(undefined, data.totalAmount, data.amountPaid, dueDate),
    bookingId:  data.bookingId  || null,
    bookingRef: data.bookingRef || null,
    notes:      data.notes      || null,
    taxRate:    data.taxRate   ?? null,
    taxAmount:  data.taxAmount ?? null,
    financeApprovalStatus:   "pending",
    financeApprovedBy:       null,
    financeApprovedAt:       null,
    financeRejectedBy:       null,
    financeRejectedAt:       null,
    financeRejectionReason:  null,
  });
}

export async function updateInvoice(
  id: string,
  data: Partial<InvoiceFormData>
): Promise<void> {
  const patch: Partial<Invoice> = { ...data };
  const existing = await invoiceRepository.findById(id);
  if (existing) {
    if (data.totalAmount !== undefined || data.amountPaid !== undefined || data.dueDate !== undefined) {
      const totalAmount = data.totalAmount ?? existing.totalAmount;
      const amountPaid  = data.amountPaid  ?? existing.amountPaid;
      const dueDate     = data.dueDate !== undefined ? (data.dueDate || null) : existing.dueDate;
      patch.balanceDue  = totalAmount - amountPaid;
      patch.status      = computeStatus(existing.status, totalAmount, amountPaid, dueDate);
      patch.dueDate      = dueDate;
    }
    // Editing a Finance-rejected invoice automatically resubmits it — no
    // separate "resubmit" button. Rejection history (by/at/reason) is left
    // intact until overwritten by a future rejection.
    if (existing.financeApprovalStatus === "rejected") {
      patch.financeApprovalStatus = "pending";
    }
  }
  return invoiceRepository.update(id, patch);
}

// Finance must approve an invoice before it can be marked sent.
export async function approveInvoiceFinance(id: string, approvedBy: string): Promise<void> {
  return invoiceRepository.update(id, {
    financeApprovalStatus: "approved",
    financeApprovedBy:     approvedBy,
    financeApprovedAt:     serverTimestamp(),
  } as Partial<Invoice>);
}

// Finance rejects the invoice with a reason instead of approving — editing
// the invoice later (see updateInvoice) automatically resubmits it.
export async function rejectInvoiceFinance(id: string, rejectedBy: string, reason: string): Promise<void> {
  return invoiceRepository.update(id, {
    financeApprovalStatus:  "rejected",
    financeRejectedBy:      rejectedBy,
    financeRejectedAt:      serverTimestamp(),
    financeRejectionReason: reason,
  } as Partial<Invoice>);
}

export async function markInvoiceSent(id: string): Promise<void> {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) return;
  if (invoice.financeApprovalStatus !== "approved") {
    throw new Error("Invoice must be approved by Finance before it can be sent.");
  }
  const status = computeStatus(INVOICE_STATUS.SENT, invoice.totalAmount, invoice.amountPaid, invoice.dueDate);
  return invoiceRepository.update(id, { status });
}

export async function deleteInvoice(id: string): Promise<void> {
  return invoiceRepository.delete(id);
}
