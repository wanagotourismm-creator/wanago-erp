import { where, orderBy, type QueryConstraint } from "firebase/firestore";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { invoiceRepository } from "@/modules/invoices/services/invoice.repository";
import { FIRESTORE_COLLECTIONS, INVOICE_STATUS, type InvoiceStatus } from "@/lib/constants";
import { generateRefNumber } from "@/lib/utils/helpers";
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

export async function fetchInvoices(filters?: {
  status?:   string;
  officeId?: string;
}): Promise<Invoice[]> {
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
  if (filters?.status)   constraints.unshift(where("status",   "==", filters.status));
  if (filters?.officeId) constraints.unshift(where("officeId", "==", filters.officeId));
  return invoiceRepository.findMany({ constraints });
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
  });
}

export async function updateInvoice(
  id: string,
  data: Partial<InvoiceFormData>
): Promise<void> {
  const patch: Partial<Invoice> = { ...data };
  if (data.totalAmount !== undefined || data.amountPaid !== undefined || data.dueDate !== undefined) {
    const existing = await invoiceRepository.findById(id);
    if (existing) {
      const totalAmount = data.totalAmount ?? existing.totalAmount;
      const amountPaid  = data.amountPaid  ?? existing.amountPaid;
      const dueDate     = data.dueDate !== undefined ? (data.dueDate || null) : existing.dueDate;
      patch.balanceDue  = totalAmount - amountPaid;
      patch.status      = computeStatus(existing.status, totalAmount, amountPaid, dueDate);
      patch.dueDate      = dueDate;
    }
  }
  return invoiceRepository.update(id, patch);
}

export async function markInvoiceSent(id: string): Promise<void> {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) return;
  const status = computeStatus(INVOICE_STATUS.SENT, invoice.totalAmount, invoice.amountPaid, invoice.dueDate);
  return invoiceRepository.update(id, { status });
}

export async function deleteInvoice(id: string): Promise<void> {
  return invoiceRepository.delete(id);
}
