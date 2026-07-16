import { where, serverTimestamp, type QueryConstraint } from "firebase/firestore";
import { auth } from "@/lib/firebase/client";
import { uploadFile } from "@/lib/storage/upload";
import { quotationRepository } from "@/modules/quotations/services/quotation.repository";
import { toDate, formatDate, joinAddressCity } from "@/lib/utils/helpers";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import { createBooking } from "@/modules/bookings/services/booking.service";
import type { Quotation, QuotationFormData, QuotationLineItem } from "@/modules/quotations/types";
import { notifyUser } from "@/lib/notify";
import { fetchUsersByPermission, fetchUserById } from "@/lib/notify-recipients";
import { fetchCustomerById } from "@/modules/customers/services/customer.service";
import { fetchCompanySettings } from "@/modules/admin/settings/services/company-settings.service";
import { generateQuotationPdfBlob, loadCompanyLogoDataUrl } from "@/lib/pdf/quotation-pdf";

// Notification helpers below are best-effort — a failure here must never
// break the actual quotation creation/approval/rejection flow.

async function notifyFinanceApprovers(quotation: Quotation): Promise<void> {
  try {
    const approvers = await fetchUsersByPermission("quotations:finance_approve");
    await Promise.all(
      approvers.map((u) =>
        notifyUser({
          userId:   u.id,
          email:    u.email,
          title:    `New quotation ${quotation.refNumber} needs Finance approval`,
          body:     `${quotation.customerName} — ${quotation.totalAmount}`,
          link:     "/approvals",
          category: "approval",
        })
      )
    );
  } catch {
    // Notification failures must not block the quotation flow.
  }
}

async function notifyCreator(createdBy: string, title: string, body: string): Promise<void> {
  try {
    const creator = await fetchUserById(createdBy);
    if (!creator) return;
    await notifyUser({
      userId:   creator.id,
      email:    creator.email,
      title,
      body,
      link:     "/quotations",
      category: "approval",
    });
  } catch {
    // Notification failures must not block the quotation flow.
  }
}

// Emails the branded quotation PDF to the customer — fired automatically
// the moment a quotation is created (mirrors how leave decisions
// auto-email the employee), and reused by sendQuotation() below to
// resend/send-on-demand once status tracking exists. Best-effort and
// entirely non-blocking: no customer email on file, or any failure
// generating/uploading/sending, just means no email goes out — the
// quotation itself is already saved either way.
export async function sendQuotationPdfToCustomer(quotation: Quotation): Promise<void> {
  try {
    const customer = await fetchCustomerById(quotation.customerId);
    if (!customer?.email) return;

    const company = await fetchCompanySettings();
    const logoDataUrl = await loadCompanyLogoDataUrl(company.logoUrl);

    const blob = await generateQuotationPdfBlob({
      refNumber: quotation.refNumber,
      date: formatDate(quotation.createdAt, "dd/MM/yyyy"),
      company: {
        businessName: company.businessName,
        addressLine: joinAddressCity(company.address, company.city),
        phone: company.phone || undefined,
        gstNumber: company.gstEnabled ? company.gstNumber || undefined : undefined,
      },
      customer: {
        name: quotation.customerName,
        addressLine: customer.address ?? undefined,
        phone: quotation.customerPhone,
      },
      lineItems: quotation.lineItems.map((li) => ({
        description: li.description, pax: quotation.pax || null, price: li.amount, total: li.amount * (quotation.pax || 1),
      })),
      subtotal: quotation.subtotal,
      grandTotal: quotation.totalAmount,
      bank: {
        accountName: company.bankAccountName || company.businessName, accountNumber: company.bankAccountNumber,
        ifsc: company.bankIfscCode, bankName: company.bankName, qrDataUrl: company.paymentQrUrl || null,
      },
      terms: company.quotationTerms.split("\n").map((t) => t.trim()).filter(Boolean),
      logoDataUrl: logoDataUrl ?? "",
      websiteUrl: company.websiteUrl,
      socialHandle: company.socialHandle,
    });

    const pdfUrl = await uploadFile(`quotations/${quotation.refNumber}.pdf`, blob);

    const idToken = await auth.currentUser?.getIdToken().catch(() => null);
    await fetch("/api/quotations/send-email", {
      method: "POST",
      headers: { "content-type": "application/json", ...(idToken ? { authorization: `Bearer ${idToken}` } : {}) },
      body: JSON.stringify({
        to: customer.email, customerName: quotation.customerName, refNumber: quotation.refNumber,
        grandTotal: quotation.totalAmount, pdfUrl,
      }),
    });
  } catch {
    // Best-effort — quotation creation already succeeded regardless.
  }
}

// Each line item's amount is a PER-PAX price (matches the branded PDF's
// PRICE column) — the line's extended total is amount × pax, so the
// subtotal is the sum of amounts multiplied by the traveller count, not
// a flat sum of the entered amounts.
function computeTotals(lineItems: QuotationLineItem[], taxRate: number | null | undefined, pax: number | null | undefined) {
  const paxCount    = pax && pax > 0 ? pax : 1;
  const perPaxTotal = lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);
  const subtotal    = perPaxTotal * paxCount;
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
  createdBy: string,
  // Auto-sends by default (the manual "New Quotation" form is filled in
  // with real pricing before submit, so the quotation is genuinely ready).
  // Callers that seed an unreviewed starting draft — e.g.
  // createDraftQuotationFromWonLead, whose starting price can be 0 when
  // the lead has no budget on file — must pass autoSend: false so nothing
  // goes to the customer until a human has reviewed/priced it and sent it
  // explicitly via sendQuotation().
  options?: { autoSend?: boolean }
): Promise<Quotation> {
  const refNumber = await nextRefNumber("QUOTATION");
  const { subtotal, taxAmount, totalAmount } = computeTotals(data.lineItems, data.taxRate, data.pax);

  const quotation = await quotationRepository.create({
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

  await notifyFinanceApprovers(quotation);
  if (options?.autoSend !== false) {
    await sendQuotationPdfToCustomer(quotation);
  }

  return quotation;
}

export async function updateQuotation(
  id: string,
  data: Partial<QuotationFormData>
): Promise<void> {
  const patch: Partial<Quotation> = { ...data };
  const existing = await quotationRepository.findById(id);
  if (existing) {
    if (data.lineItems !== undefined || data.taxRate !== undefined || data.pax !== undefined) {
      const lineItems = data.lineItems ?? existing.lineItems;
      const taxRate   = data.taxRate !== undefined ? data.taxRate : existing.taxRate;
      const pax       = data.pax     !== undefined ? data.pax     : existing.pax;
      const { subtotal, taxAmount, totalAmount } = computeTotals(lineItems, taxRate, pax);
      patch.subtotal    = subtotal;
      patch.taxAmount   = taxAmount;
      patch.totalAmount = totalAmount;
      patch.taxRate     = taxRate;
    }
    if (existing.financeApprovalStatus === "rejected") {
      patch.financeApprovalStatus = "pending";
    }
  }

  await quotationRepository.update(id, patch);

  if (existing?.financeApprovalStatus === "rejected") {
    const updated = await quotationRepository.findById(id);
    if (updated) await notifyFinanceApprovers(updated);
  }
}

export async function deleteQuotation(id: string): Promise<void> {
  return quotationRepository.delete(id);
}

// Status transitions — previously only "draft" (on create) and
// "converted" (on convertQuotationToBooking) were ever written, so a
// quotation could never reach "accepted" and the Convert to Booking
// button (gated on status === "accepted") could never appear. These give
// staff the missing manual actions; "accepted" is a manual call because
// there's no existing signal (e.g. a linked payment) that could infer it
// automatically — payments in this app attach to Invoices, which don't
// exist yet at the quotation stage.

export async function sendQuotation(quotation: Quotation): Promise<void> {
  await quotationRepository.update(quotation.id, { status: "sent" } as Partial<Quotation>);
  await sendQuotationPdfToCustomer(quotation);
}

export async function markQuotationAccepted(id: string): Promise<void> {
  await quotationRepository.update(id, { status: "accepted" } as Partial<Quotation>);
}

export async function rejectQuotation(id: string): Promise<void> {
  await quotationRepository.update(id, { status: "rejected" } as Partial<Quotation>);
}

export async function approveQuotationFinance(id: string, approvedBy: string): Promise<void> {
  const existing = await quotationRepository.findById(id);

  await quotationRepository.update(id, {
    financeApprovalStatus: "approved",
    financeApprovedBy: approvedBy,
    financeApprovedAt: serverTimestamp(),
  } as Partial<Quotation>);

  if (existing) {
    await notifyCreator(
      existing.createdBy,
      `Quotation ${existing.refNumber} approved`,
      `${existing.customerName}'s quotation has been approved by Finance and can now be converted to a booking.`
    );
  }
}

export async function rejectQuotationFinance(id: string, rejectedBy: string, reason: string): Promise<void> {
  const existing = await quotationRepository.findById(id);

  await quotationRepository.update(id, {
    financeApprovalStatus: "rejected",
    financeRejectedBy: rejectedBy,
    financeRejectedAt: serverTimestamp(),
    financeRejectionReason: reason,
  } as Partial<Quotation>);

  if (existing) {
    await notifyCreator(
      existing.createdBy,
      `Quotation ${existing.refNumber} rejected`,
      `${existing.customerName}'s quotation was rejected by Finance: ${reason}. Edit and resubmit it to send it back for approval.`
    );
  }
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
