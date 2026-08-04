import { where, type QueryConstraint } from "firebase/firestore";
import { serverTimestamp, doc, runTransaction } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { invoiceRepository } from "@/modules/invoices/services/invoice.repository";
import { FIRESTORE_COLLECTIONS, INVOICE_STATUS, type InvoiceStatus } from "@/lib/constants";
import { toDate, formatDate, joinAddressCity } from "@/lib/utils/helpers";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import type { Invoice, InvoiceFormData } from "@/modules/invoices/types";
import type { Booking } from "@/modules/bookings/types";
import { notifyUser } from "@/lib/notify";
import { fetchUserById } from "@/lib/notify-recipients";
import { fetchBookingById } from "@/modules/bookings/services/booking.service";
import { markLeadWonFromPayment } from "@/modules/leads/services/lead.service";
import { fetchCustomerById } from "@/modules/customers/services/customer.service";
import { fetchCompanySettings } from "@/modules/admin/settings/services/company-settings.service";
import { uploadFile } from "@/lib/storage/upload";
import { generateInvoicePdfBlob, loadCompanyLogoDataUrlForInvoice } from "@/lib/pdf/invoice-pdf";

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

export async function fetchInvoiceByBookingId(bookingId: string): Promise<Invoice | null> {
  const rows = await invoiceRepository.findMany({ constraints: [where("bookingId", "==", bookingId)] });
  return rows[0] ?? null;
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
    // financeApprovalStatus/etc. are deprecated — invoice status is now
    // driven purely by amountPaid vs totalAmount (see computeStatus).
    // Fields are left in the schema/type to avoid migrating old documents.
    financeApprovalStatus:   "approved",
    financeApprovedBy:       null,
    financeApprovedAt:       null,
    financeRejectedBy:       null,
    financeRejectedAt:       null,
    financeRejectionReason:  null,
  });

  return invoice;
}

// Auto-generates the invoice the moment a booking is confirmed — before
// this, Finance had to remember to manually create one for every single
// confirmed booking (createInvoice previously had no automatic trigger at
// all, only the manual "New Invoice" form and the AI assistant tool).
// Idempotent like getOrCreateOperationsBooking — safe to call more than
// once for the same booking.
export async function getOrCreateInvoiceForBooking(booking: Booking, createdBy: string): Promise<Invoice> {
  const existing = await fetchInvoiceByBookingId(booking.id);
  if (existing) return existing;

  return createInvoice({
    bookingId:     booking.id,
    bookingRef:    booking.refNumber,
    customerId:    booking.customerId,
    customerName:  booking.customerName,
    customerPhone: booking.customerPhone,
    totalAmount:   booking.totalAmount,
    amountPaid:    booking.advanceAmount,
    taxRate:       null,
    taxAmount:     null,
    issueDate:     new Date().toISOString().slice(0, 10),
    dueDate:       null,
    officeId:      booking.officeId,
    officeName:    booking.officeName,
    notes:         `Auto-generated from confirmed booking ${booking.refNumber}.`,
    createdBy,
  }, createdBy);
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
  }

  await invoiceRepository.update(id, patch);
}

export async function markInvoiceSent(id: string): Promise<void> {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) return;
  if (invoice.status !== INVOICE_STATUS.DRAFT) return;
  const status = computeStatus(INVOICE_STATUS.SENT, invoice.totalAmount, invoice.amountPaid, invoice.dueDate);
  return invoiceRepository.update(id, { status });
}

// Actually dispatches the invoice PDF to the customer (email attachment +
// WhatsApp link) — markInvoiceSent above only ever flipped the status field
// with nothing sent, which meant "Mark Sent" was silently a no-op from the
// customer's point of view. Mirrors quotation.service.ts's
// sendQuotationPdfToCustomer/notify pattern. The status flip always happens
// (same as markInvoiceSent), even if the actual send fails below — the
// invoice's own state shouldn't get stuck just because e.g. the customer has
// no email on file.
export async function sendInvoiceToCustomer(invoice: Invoice): Promise<void> {
  if (invoice.status === INVOICE_STATUS.DRAFT) {
    const status = computeStatus(INVOICE_STATUS.SENT, invoice.totalAmount, invoice.amountPaid, invoice.dueDate);
    await invoiceRepository.update(invoice.id, { status });
  }

  try {
    const customer = await fetchCustomerById(invoice.customerId);
    const company = await fetchCompanySettings();
    const logoDataUrl = await loadCompanyLogoDataUrlForInvoice(company.logoUrl);
    const description = invoice.bookingRef ? `Booking ${invoice.bookingRef}` : "Services rendered";

    const blob = await generateInvoicePdfBlob({
      refNumber: invoice.refNumber,
      date: formatDate(invoice.issueDate, "dd/MM/yyyy"),
      dueDate: invoice.dueDate ? formatDate(invoice.dueDate, "dd/MM/yyyy") : null,
      company: {
        businessName: company.businessName,
        addressLine: joinAddressCity(company.address, company.city),
        phone: company.phone || undefined,
        gstNumber: company.gstEnabled ? company.gstNumber || undefined : undefined,
      },
      customer: { name: invoice.customerName, phone: invoice.customerPhone },
      lineItems: [{ description, pax: null, price: invoice.totalAmount, total: invoice.totalAmount }],
      subtotal: invoice.totalAmount - (invoice.taxAmount ?? 0),
      grandTotal: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      balanceDue: invoice.balanceDue,
      bank: {
        accountName:   company.bankAccountName || company.businessName,
        accountNumber: company.bankAccountNumber,
        ifsc:          company.bankIfscCode,
        bankName:      company.bankName,
        qrDataUrl:     company.paymentQrUrl || null,
      },
      logoDataUrl: logoDataUrl ?? "",
      websiteUrl: company.websiteUrl,
      socialHandle: company.socialHandle,
    });

    const pdfUrl = await uploadFile(`invoices/${invoice.refNumber}.pdf`, blob);

    const customerEmail = customer?.email;
    if (customerEmail) {
      const idToken = await auth.currentUser?.getIdToken().catch(() => null);
      await fetch("/api/invoices/send-email", {
        method: "POST",
        headers: { "content-type": "application/json", ...(idToken ? { authorization: `Bearer ${idToken}` } : {}) },
        body: JSON.stringify({
          to: customerEmail, customerName: invoice.customerName, refNumber: invoice.refNumber,
          balanceDue: invoice.balanceDue, pdfUrl,
        }),
      }).catch(() => {});
    }

    const customerPhone = customer?.phone || invoice.customerPhone;
    if (customerPhone) {
      await notifyUser({
        phone:    customerPhone,
        title:    "Your invoice is ready",
        body:     `Hi ${invoice.customerName}, here's your invoice ${invoice.refNumber}: ${pdfUrl}`,
        category: "system",
      });
    }
  } catch (err) {
    console.error("[invoice.service] sendInvoiceToCustomer failed to send:", err);
  }
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
//
// `amountDelta` is signed: createPayment passes the positive payment amount;
// deletePayment (payment.service.ts) passes it negated to reverse a deleted
// payment's contribution — without that reversal, deleting a payment left
// the invoice's amountPaid/balanceDue/status exactly as if the money were
// still collected. Clamped at 0 so a stray double-reversal can't ever push
// amountPaid negative.
export async function applyPaymentToInvoice(invoiceId: string, amountDelta: number): Promise<void> {
  const ref = doc(db, FIRESTORE_COLLECTIONS.INVOICES, invoiceId);
  const { prevStatus, updated } = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return { prevStatus: null, updated: null };
    const invoice = snap.data() as Invoice;
    const amountPaid = Math.max(0, (invoice.amountPaid ?? 0) + amountDelta);
    const balanceDue = invoice.totalAmount - amountPaid;
    const status = computeStatus(invoice.status, invoice.totalAmount, amountPaid, invoice.dueDate);
    tx.update(ref, { amountPaid, balanceDue, status, updatedAt: serverTimestamp() });
    return { prevStatus: invoice.status, updated: { ...invoice, id: invoiceId, amountPaid, balanceDue, status } as Invoice };
  });

  if (updated && prevStatus !== INVOICE_STATUS.PAID && updated.status === INVOICE_STATUS.PAID) {
    try {
      await onInvoiceFullyPaid(updated);
    } catch (err) {
      console.error("[invoice.service] onInvoiceFullyPaid failed:", err);
    }
  }
}

// Best-effort — fired the moment an invoice first becomes fully paid.
// Notifies the currently-assigned Sales agent that it's time to hand the
// file over to Operations, and flips the originating Lead to "won" (same
// side-effect chain as the manual Kanban drag — see markLeadWonFromPayment).
async function onInvoiceFullyPaid(invoice: Invoice): Promise<void> {
  if (!invoice.bookingId) return;
  const booking = await fetchBookingById(invoice.bookingId);
  if (!booking) return;

  const targetUserId = booking.assignedTo || booking.createdBy;
  if (targetUserId) {
    const recipient = await fetchUserById(targetUserId);
    if (recipient) {
      await notifyUser({
        userId:   recipient.id,
        email:    recipient.email,
        title:    "Payment received — hand over to Operations",
        body:     `${booking.customerName}'s invoice ${invoice.refNumber} is fully paid.`,
        link:     "/bookings",
        category: "approval",
      });
    }
  }

  if (booking.leadId) {
    await markLeadWonFromPayment(booking.leadId);
  }
}
