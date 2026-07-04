import { where, type QueryConstraint } from "firebase/firestore";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { paymentRepository } from "@/modules/payments/services/payment.repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { generateRefNumber, toDate } from "@/lib/utils/helpers";
import { fetchInvoiceById, updateInvoice } from "@/modules/invoices/services/invoice.service";
import type { Payment, PaymentFormData } from "@/modules/payments/types";

// Note: sorted client-side (not via Firestore orderBy) so filtered
// queries only need single-field indexes, which Firestore creates
// automatically — no manual composite index deployment required.
export async function fetchPayments(filters?: {
  officeId?: string;
}): Promise<Payment[]> {
  const constraints: QueryConstraint[] = [];
  if (filters?.officeId) constraints.push(where("officeId", "==", filters.officeId));
  const payments = await paymentRepository.findMany({ constraints });
  return payments.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export async function fetchPaymentById(id: string): Promise<Payment | null> {
  return paymentRepository.findById(id);
}

export async function createPayment(
  data: PaymentFormData,
  createdBy: string
): Promise<Payment> {
  const existing = await getDocs(collection(db, FIRESTORE_COLLECTIONS.PAYMENTS));
  const ids       = existing.docs.map(d => d.data().refNumber ?? "");
  const refNumber = generateRefNumber("PAYMENT", ids);

  const payment = await paymentRepository.create({
    ...data,
    refNumber,
    createdBy,
    status:          "active",
    invoiceId:       data.invoiceId       || null,
    invoiceRef:      data.invoiceRef      || null,
    referenceNumber: data.referenceNumber || null,
    notes:           data.notes           || null,
  });

  if (payment.invoiceId) {
    const invoice = await fetchInvoiceById(payment.invoiceId);
    if (invoice) {
      await updateInvoice(invoice.id, { amountPaid: invoice.amountPaid + payment.amount });
    }
  }

  return payment;
}

export async function deletePayment(id: string): Promise<void> {
  return paymentRepository.delete(id);
}
