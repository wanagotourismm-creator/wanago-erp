import { where, type QueryConstraint } from "firebase/firestore";
import { collection, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { quotationRepository } from "@/modules/quotations/services/quotation.repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { generateRefNumber, toDate } from "@/lib/utils/helpers";
import { createBooking } from "@/modules/bookings/services/booking.service";
import type { Quotation, QuotationFormData, QuotationLineItem } from "@/modules/quotations/types";

function computeTotals(lineItems: QuotationLineItem[], taxRate: number | null | undefined) {
  const subtotal    = lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);
  const taxAmount   = taxRate ? subtotal * (taxRate / 100) : null;
  const totalAmount = subtotal + (taxAmount ?? 0);
  return { subtotal, taxAmount, totalAmount };
}

// Note: sorted client-side (not via Firestore orderBy) so filtered
// queries only need single-field indexes, which Firestore creates
// automatically — no manual composite index deployment required.
export async function fetchQuotations(filters?: {
  status?:   string;
  officeId?: string;
}): Promise<Quotation[]> {
  const constraints: QueryConstraint[] = [];
  if (filters?.status)   constraints.push(where("status",   "==", filters.status));
  if (filters?.officeId) constraints.push(where("officeId", "==", filters.officeId));
  const quotations = await quotationRepository.findMany({ constraints });
  return quotations.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export async function fetchQuotationById(id: string): Promise<Quotation | null> {
  return quotationRepository.findById(id);
}

export async function createQuotation(
  data: QuotationFormData,
  createdBy: string
): Promise<Quotation> {
  const existing = await getDocs(collection(db, FIRESTORE_COLLECTIONS.QUOTATIONS));
  const ids       = existing.docs.map(d => d.data().refNumber ?? "");
  const refNumber = generateRefNumber("QUOTATION", ids);
  const { subtotal, taxAmount, totalAmount } = computeTotals(data.lineItems, data.taxRate);

  return quotationRepository.create({
    ...data,
    refNumber,
    createdBy,
    subtotal,
    taxAmount,
    totalAmount,
    status:             "draft",
    packageId:          data.packageId  || null,
    packageName:        data.packageName || null,
    validUntil:         data.validUntil || null,
    notes:              data.notes      || null,
    taxRate:            data.taxRate    ?? null,
    convertedBookingId: null,
    financeApprovalStatus:   "pending",
    financeApprovedBy:       null,
    financeApprovedAt:       null,
    financeRejectedBy:       null,
    financeRejectedAt:       null,
    financeRejectionReason:  null,
  });
}

export async function updateQuotation(
  id: string,
  data: Partial<QuotationFormData>
): Promise<void> {
  const patch: Partial<Quotation> = { ...data };
  const existing = await quotationRepository.findById(id);
  if (existing) {
    if (data.lineItems !== undefined || data.taxRate !== undefined) {
      const lineItems = data.lineItems ?? existing.lineItems;
      const taxRate   = data.taxRate !== undefined ? data.taxRate : existing.taxRate;
      const { subtotal, taxAmount, totalAmount } = computeTotals(lineItems, taxRate);
      patch.subtotal    = subtotal;
      patch.taxAmount   = taxAmount;
      patch.totalAmount = totalAmount;
      patch.taxRate     = taxRate;
    }
    if (existing.financeApprovalStatus === "rejected") {
      patch.financeApprovalStatus = "pending";
    }
  }
  return quotationRepository.update(id, patch);
}

export async function deleteQuotation(id: string): Promise<void> {
  return quotationRepository.delete(id);
}

export async function approveQuotationFinance(id: string, approvedBy: string): Promise<void> {
  return quotationRepository.update(id, {
    financeApprovalStatus: "approved",
    financeApprovedBy: approvedBy,
    financeApprovedAt: serverTimestamp(),
  } as Partial<Quotation>);
}

export async function rejectQuotationFinance(id: string, rejectedBy: string, reason: string): Promise<void> {
  return quotationRepository.update(id, {
    financeApprovalStatus: "rejected",
    financeRejectedBy: rejectedBy,
    financeRejectedAt: serverTimestamp(),
    financeRejectionReason: reason,
  } as Partial<Quotation>);
}

// Mirrors leads' convertLeadToCustomer pattern: reads from the source
// record, creates the target record, then updates the source to point
// at it and mark it converted.
export async function convertQuotationToBooking(
  quotation: Quotation,
  createdBy: string
): Promise<void> {
  const fresh = await quotationRepository.findById(quotation.id);
  if (!fresh || fresh.financeApprovalStatus !== "approved") {
    throw new Error("Quotation must be approved by Finance before it can be converted to a booking.");
  }

  const booking = await createBooking({
    customerId:    quotation.customerId,
    customerName:  quotation.customerName,
    customerPhone: quotation.customerPhone,
    destination:   quotation.destination,
    tripType:      "domestic",
    packageId:     quotation.packageId,
    packageName:   quotation.packageName,
    travelDate:    null,
    returnDate:    null,
    pax:           quotation.pax || 1,
    totalAmount:   quotation.totalAmount,
    advanceAmount: 0,
    assignedTo:    null,
    agentName:     null,
    officeId:      quotation.officeId,
    officeName:    quotation.officeName,
    notes:         `Converted from quotation ${quotation.refNumber}`,
    createdBy,
  }, createdBy);

  await quotationRepository.update(quotation.id, {
    status:             "converted",
    convertedBookingId: booking.id,
  });
}
