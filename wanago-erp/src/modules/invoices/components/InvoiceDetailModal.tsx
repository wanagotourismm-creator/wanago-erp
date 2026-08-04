"use client";

import { useState, useEffect } from "react";
import { X, Edit2, Trash2, Send, Receipt, Building2, Download, Loader2, Wallet } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useIsMobile } from "@/lib/utils/breakpoint";
import { InvoiceStatusBadge, formatAmount } from "@/modules/invoices/components/InvoiceBadges";
import { formatDate, initials, joinAddressCity } from "@/lib/utils/helpers";
import { fetchCompanySettings, DEFAULT_COMPANY_SETTINGS, type CompanySettings } from "@/modules/admin/settings/services/company-settings.service";
import { downloadInvoicePdf, loadCompanyLogoDataUrlForInvoice } from "@/lib/pdf/invoice-pdf";
import { UpiPaymentPanel } from "@/components/shared/UpiPaymentPanel";
import type { Invoice } from "@/modules/invoices/types";

type Props = {
  invoice:            Invoice | null;
  canManage:          boolean;
  canRecordPayment:   boolean;
  onClose:            () => void;
  onEdit:             (invoice: Invoice) => void;
  onDelete:           (invoice: Invoice) => void;
  onSend:             (invoice: Invoice) => Promise<{ error: string | null }>;
  onRecordPayment:    (invoice: Invoice) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function InvoiceDetailModal({ invoice, canManage, canRecordPayment, onClose, onEdit, onDelete, onSend, onRecordPayment }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!invoice) return;
    fetchCompanySettings().then(setCompanySettings).catch(() => {});
  }, [invoice?.id]);

  if (!invoice) return null;

  const canMarkSent = invoice.status === "draft";

  async function handleSend() {
    if (!invoice) return;
    setSending(true);
    setSendError(null);
    const { error } = await onSend(invoice);
    setSending(false);
    if (error) setSendError(error);
  }

  async function handleDownloadPdf() {
    if (!invoice) return;
    setDownloading(true);
    try {
      const settings = await fetchCompanySettings();
      const logoDataUrl = await loadCompanyLogoDataUrlForInvoice(settings.logoUrl);
      const description = invoice.bookingRef ? `Booking ${invoice.bookingRef}` : "Services rendered";
      await downloadInvoicePdf({
        refNumber: invoice.refNumber,
        date: formatDate(invoice.issueDate, "dd/MM/yyyy"),
        dueDate: invoice.dueDate ? formatDate(invoice.dueDate, "dd/MM/yyyy") : null,
        company: {
          businessName: settings.businessName,
          addressLine: joinAddressCity(settings.address, settings.city),
          phone: settings.phone || undefined,
          gstNumber: settings.gstEnabled ? settings.gstNumber || undefined : undefined,
        },
        customer: {
          name: invoice.customerName,
          phone: invoice.customerPhone,
        },
        lineItems: [{ description, pax: null, price: invoice.totalAmount, total: invoice.totalAmount }],
        subtotal: invoice.totalAmount - (invoice.taxAmount ?? 0),
        grandTotal: invoice.totalAmount,
        amountPaid: invoice.amountPaid,
        balanceDue: invoice.balanceDue,
        bank: {
          accountName: settings.bankAccountName || settings.businessName,
          accountNumber: settings.bankAccountNumber,
          ifsc: settings.bankIfscCode,
          bankName: settings.bankName,
          qrDataUrl: settings.paymentQrUrl || null,
        },
        logoDataUrl: logoDataUrl ?? "",
        websiteUrl: settings.websiteUrl,
        socialHandle: settings.socialHandle,
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal onClose={onClose} size={isMobile ? "full" : "md"}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {initials(invoice.customerName)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{invoice.customerName}</h2>
              <p className="text-xs text-muted-foreground">{invoice.refNumber} · Issued {formatDate(invoice.issueDate)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">

          {sendError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{sendError}</div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <InvoiceStatusBadge status={invoice.status} />
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Receipt size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Invoice Details</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Customer Phone" value={invoice.customerPhone} />
              <Row label="Booking Ref" value={invoice.bookingRef} />
              <Row label="Total Amount" value={formatAmount(invoice.totalAmount)} />
              <Row label="Amount Paid" value={formatAmount(invoice.amountPaid)} />
              <Row
                label="Balance Due"
                value={
                  <span className={invoice.balanceDue > 0 ? "text-destructive" : undefined}>
                    {invoice.balanceDue > 0 ? formatAmount(invoice.balanceDue) : "Paid"}
                  </span>
                }
              />
              <Row label="Due Date" value={invoice.dueDate ? formatDate(invoice.dueDate) : null} />
            </div>
          </div>

          {invoice.balanceDue > 0 && (
            <UpiPaymentPanel
              upiId={companySettings.upiId}
              payeeName={companySettings.businessName}
              amount={invoice.balanceDue}
              note={`Invoice ${invoice.refNumber}`}
              refId={invoice.refNumber}
            />
          )}

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Building2 size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Office</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Office" value={invoice.officeName} />
            </div>
          </div>

          {invoice.notes && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Notes</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {invoice.notes}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <button
                  onClick={() => onEdit(invoice)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
                >
                  <Edit2 size={13} /> Edit
                </button>
                <button
                  onClick={() => onDelete(invoice)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </>
            )}
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors disabled:opacity-60"
            >
              {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Download PDF
            </button>
            {canRecordPayment && invoice.balanceDue > 0 && (
              <button
                onClick={() => onRecordPayment(invoice)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
              >
                <Wallet size={13} /> Record Payment
              </button>
            )}
          </div>
          {canManage && canMarkSent && (
            <button
              onClick={handleSend}
              disabled={sending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
            >
              {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send to Customer
            </button>
          )}
        </div>

    </Modal>
  );
}
