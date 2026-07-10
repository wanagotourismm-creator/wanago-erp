import { where, type QueryConstraint } from "firebase/firestore";
import { paymentRepository } from "@/modules/payments/services/payment.repository";
import { toDate } from "@/lib/utils/helpers";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import { applyPaymentToInvoice } from "@/modules/invoices/services/invoice.service";
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
  const refNumber = await nextRefNumber("PAYMENT");

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
    await applyPaymentToInvoice(payment.invoiceId, payment.amount);
  }

  return payment;
}

export async function deletePayment(id: string): Promise<void> {
  return paymentRepository.delete(id);
}
