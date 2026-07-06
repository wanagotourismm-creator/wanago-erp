"use client";

import { useState } from "react";
import { X, Edit2, Trash2, Send, Receipt, Building2, Download, Loader2 } from "lucide-react";
import { InvoiceStatusBadge, formatAmount } from "@/modules/invoices/components/InvoiceBadges";
import { formatDate, initials } from "@/lib/utils/helpers";
import { fetchCompanySettings } from "@/modules/admin/settings/services/company-settings.service";
import { generateDocumentPdf } from "@/lib/pdf/document-pdf";
import type { Invoice } from "@/modules/invoices/types";

type Props = {
  invoice:   Invoice | null;
  canManage: boolean;
  onClose:   () => void;
  onEdit:    (invoice: Invoice) => void;
  onDelete:  (invoice: Invoice) => void;
  onSend:    (invoice: Invoice) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function InvoiceDetailModal({ invoice, canManage, onClose, onEdit, onDelete, onSend }: Props) {
  const [downloading, setDownloading] = useState(false);

  if (!invoice) return null;

  const canMarkSent = invoice.status === "draft";

  async function handleDownloadPdf() {
    if (!invoice) return;
    setDownloading(true);
    try {
      const settings = await fetchCompanySettings();
      const taxAmount = invoice.taxAmount ?? 0;
      const subtotal = invoice.totalAmount - taxAmount;
      await generateDocumentPdf({
        type: "invoice",
        refNumber: invoice.refNumber,
        date: invoice.issueDate,
        dueDateOrValidUntil: invoice.dueDate,
        company: {
          businessName: settings.businessName,
          address: settings.address,
          city: settings.city,
          phone: settings.phone,
          email: settings.email,
          gstNumber: settings.gstNumber,
          gstEnabled: settings.gstEnabled,
        },
        customer: {
          name: invoice.customerName,
          phone: invoice.customerPhone,
        },
        lineItems: [{
          description: invoice.bookingRef ? `Booking ${invoice.bookingRef}` : "Services rendered",
          amount: subtotal,
        }],
        subtotal,
        taxRate: invoice.taxRate,
        taxAmount: invoice.taxAmount,
        totalAmount: invoice.totalAmount,
        amountPaid: invoice.amountPaid,
        balanceDue: invoice.balanceDue,
        notes: invoice.notes,
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

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
          </div>
          {canManage && canMarkSent && (
            <button
              onClick={() => onSend(invoice)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Send size={13} /> Mark Sent
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
