import { where, type QueryConstraint } from "firebase/firestore";
import { serverTimestamp, doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { invoiceRepository } from "@/modules/invoices/services/invoice.repository";
import { FIRESTORE_COLLECTIONS, INVOICE_STATUS, type InvoiceStatus } from "@/lib/constants";
import { toDate } from "@/lib/utils/helpers";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import type { Invoice, InvoiceFormData } from "@/modules/invoices/types";
import { notifyUser } from "@/lib/notify";
import { fetchUsersByPermission, fetchUserById } from "@/lib/notify-recipients";

// Notifications are best-effort — a failure here must never break the
// invoice creation/approval flow itself.
async function notifyFinanceApprovers(invoice: Invoice): Promise<void> {
  try {
    const approvers = await fetchUsersByPermission("invoices:finance_approve");
    await Promise.all(
      approvers.map((u) =>
        notifyUser({
          userId:   u.id,
          email:    u.email,
          title:    `New invoice ${invoice.refNumber} needs Finance approval`,
          body:     `${invoice.customerName} — ${invoice.totalAmount}`,
          link:     "/approvals",
          category: "approval",
        })
      )
    );
  } catch {
    // ignore — notifications must not block invoice creation/update
  }
}

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
  // markInvoiceSent() passes SENT as prevStatus specifically so it sticks
  // here when nothing's been paid yet — without this branch it always fell
  // through to UNPAID and "mark sent" could never actually take effect.
  if (prevStatus === INVOICE_STATUS.SENT) return INVOICE_STATUS.SENT;
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
  const refNumber = await nextRefNumber("INVOICE");
  const dueDate   = data.dueDate || null;

  const invoice = await invoiceRepository.create({
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

  await notifyFinanceApprovers(invoice);

  return invoice;
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

  await invoiceRepository.update(id, patch);

  if (existing?.financeApprovalStatus === "rejected") {
    const updated = await invoiceRepository.findById(id);
    if (updated) await notifyFinanceApprovers(updated);
  }
}

// Finance must approve an invoice before it can be marked sent.
export async function approveInvoiceFinance(id: string, approvedBy: string): Promise<void> {
  const existing = await invoiceRepository.findById(id);

  await invoiceRepository.update(id, {
    financeApprovalStatus: "approved",
    financeApprovedBy:     approvedBy,
    financeApprovedAt:     serverTimestamp(),
  } as Partial<Invoice>);

  if (existing) {
    try {
      const creator = await fetchUserById(existing.createdBy);
      if (creator) {
        await notifyUser({
          userId:   creator.id,
          email:    creator.email,
          title:    `Invoice ${existing.refNumber} approved by Finance`,
          body:     `${existing.customerName} — ${existing.totalAmount} — this invoice can now be marked sent.`,
          link:     "/invoices",
          category: "approval",
        });
      }
    } catch {
      // ignore — notifications must not block the approval flow
    }
  }
}

// Finance rejects the invoice with a reason instead of approving — editing
// the invoice later (see updateInvoice) automatically resubmits it.
export async function rejectInvoiceFinance(id: string, rejectedBy: string, reason: string): Promise<void> {
  const existing = await invoiceRepository.findById(id);

  await invoiceRepository.update(id, {
    financeApprovalStatus:  "rejected",
    financeRejectedBy:      rejectedBy,
    financeRejectedAt:      serverTimestamp(),
    financeRejectionReason: reason,
  } as Partial<Invoice>);

  if (existing) {
    try {
      const creator = await fetchUserById(existing.createdBy);
      if (creator) {
        await notifyUser({
          userId:   creator.id,
          email:    creator.email,
          title:    `Invoice ${existing.refNumber} rejected by Finance`,
          body:     `${existing.customerName} — ${existing.totalAmount} — reason: ${reason}. Edit and resubmit to send it back for approval.`,
          link:     "/invoices",
          category: "approval",
        });
      }
    } catch {
      // ignore — notifications must not block the rejection flow
    }
  }
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

// Recording a payment against an invoice used to be a plain read-then-write
// (fetch the invoice, add the payment amount, write the new total) — two
// payments recorded near-simultaneously against the same invoice could both
// read the same stale amountPaid and the second write would silently
// overwrite the first's contribution. A transaction re-reads inside the
// commit and retries on conflict, so concurrent payments always accumulate
// correctly.
export async function applyPaymentToInvoice(invoiceId: string, amount: number): Promise<void> {
  const ref = doc(db, FIRESTORE_COLLECTIONS.INVOICES, invoiceId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const invoice = snap.data() as Invoice;
    const amountPaid = (invoice.amountPaid ?? 0) + amount;
    const balanceDue = invoice.totalAmount - amountPaid;
    const status = computeStatus(invoice.status, invoice.totalAmount, amountPaid, invoice.dueDate);
    tx.update(ref, { amountPaid, balanceDue, status, updatedAt: serverTimestamp() });
  });
}
