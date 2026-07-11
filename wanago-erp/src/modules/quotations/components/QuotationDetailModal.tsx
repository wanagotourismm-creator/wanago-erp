"use client";

import { useState } from "react";
import { X, Edit2, Trash2, Download, Receipt, MapPin, ArrowRightLeft, Loader2, Send, CheckCircle2, XCircle } from "lucide-react";
import { QuotationStatusBadge, formatAmount } from "@/modules/quotations/components/QuotationBadges";
import { cn, formatDate, initials, joinAddressCity } from "@/lib/utils/helpers";
import { fetchCompanySettings } from "@/modules/admin/settings/services/company-settings.service";
import { fetchCustomerById } from "@/modules/customers/services/customer.service";
import { downloadQuotationPdf, loadWanagoLogoDataUrl } from "@/lib/pdf/quotation-pdf";
import type { Quotation } from "@/modules/quotations/types";

type Props = {
  quotation: Quotation | null;
  canEdit:   boolean;
  canDelete: boolean;
  onClose:   () => void;
  onEdit:    (quotation: Quotation) => void;
  onDelete:  (quotation: Quotation) => void;
  onConvert: (quotation: Quotation) => void;
  onSend:    (quotation: Quotation) => void;
  onAccept:  (quotation: Quotation) => void;
  onReject:  (quotation: Quotation) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

const FINANCE_APPROVAL_LABELS: Record<string, string> = {
  pending:  "Pending Finance Approval",
  approved: "Finance Approved",
  rejected: "Finance Rejected",
};

const FINANCE_APPROVAL_STYLES: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function FinanceApprovalBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      FINANCE_APPROVAL_STYLES[status] ?? "bg-muted text-muted-foreground"
    )}>
      {FINANCE_APPROVAL_LABELS[status] ?? status}
    </span>
  );
}

export function QuotationDetailModal({ quotation, canEdit, canDelete, onClose, onEdit, onDelete, onConvert, onSend, onAccept, onReject }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [converting,  setConverting]  = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  if (!quotation) return null;
  const q = quotation;

  const canConvert   = q.status === "accepted" && q.financeApprovalStatus === "approved";
  // Draft/sent are the only "open" states — accepted/rejected/expired/
  // converted are all terminal (or, for accepted, moves on to conversion).
  const canSend      = canEdit && q.status === "draft";
  const canDecide    = canEdit && (q.status === "draft" || q.status === "sent");

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      const [company, customer, logoDataUrl] = await Promise.all([
        fetchCompanySettings(),
        fetchCustomerById(q.customerId),
        loadWanagoLogoDataUrl(),
      ]);
      await downloadQuotationPdf({
        refNumber: q.refNumber,
        date:      formatDate(q.createdAt, "dd/MM/yyyy"),
        company: {
          businessName: company.businessName,
          addressLine:  joinAddressCity(company.address, company.city),
          phone:        company.phone || undefined,
          gstNumber:    company.gstEnabled ? (company.gstNumber || undefined) : undefined,
        },
        customer: {
          name:        q.customerName,
          addressLine: customer?.address ?? undefined,
          phone:       q.customerPhone,
        },
        lineItems: q.lineItems.map((li) => ({ description: li.description, pax: q.pax || null, price: li.amount, total: li.amount * (q.pax || 1) })),
        subtotal:    q.subtotal,
        grandTotal:  q.totalAmount,
        bank: {
          accountName:   company.bankAccountName || company.businessName,
          accountNumber: company.bankAccountNumber,
          ifsc:          company.bankIfscCode,
          bankName:      company.bankName,
          qrDataUrl:     company.paymentQrUrl || null,
        },
        terms: company.quotationTerms.split("\n").map((t) => t.trim()).filter(Boolean),
        logoDataUrl: logoDataUrl ?? "",
        websiteUrl: "www.wanago.in",
        socialHandle: "@wana.go",
      });
    } finally {
      setDownloading(false);
    }
  }

  async function handleConvert() {
    setConverting(true);
    try {
      await onConvert(q);
    } finally {
      setConverting(false);
    }
  }

  async function handleSend() {
    setUpdatingStatus(true);
    try {
      await onSend(q);
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleAccept() {
    setUpdatingStatus(true);
    try {
      await onAccept(q);
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleReject() {
    if (!confirm(`Mark quotation "${q.refNumber}" as rejected? The customer didn't accept it.`)) return;
    setUpdatingStatus(true);
    try {
      await onReject(q);
    } finally {
      setUpdatingStatus(false);
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
              {initials(q.customerName)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{q.customerName}</h2>
              <p className="text-xs text-muted-foreground">{q.refNumber} · Created {formatDate(q.createdAt)}</p>
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
            <QuotationStatusBadge status={q.status} />
            <FinanceApprovalBadge status={q.financeApprovalStatus} />
          </div>
          {q.financeApprovalStatus === "rejected" && q.financeRejectionReason && (
            <p className="text-xs text-muted-foreground">
              Rejection reason: {q.financeRejectionReason}
            </p>
          )}

          <div>
            <div className="mb-1 flex items-center gap-2">
              <MapPin size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Trip Details</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Customer Phone" value={q.customerPhone} />
              <Row label="Destination" value={q.destination} />
              <Row label="Package" value={q.packageName} />
              <Row label="Pax" value={q.pax} />
              <Row label="Valid Until" value={q.validUntil ? formatDate(q.validUntil) : null} />
              <Row label="Office" value={q.officeName} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Receipt size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Line Items</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              {q.lineItems.map((li, i) => (
                <Row
                  key={i}
                  label={`${li.description} (${formatAmount(li.amount)} × ${q.pax} pax)`}
                  value={formatAmount(li.amount * (q.pax || 1))}
                />
              ))}
              <Row label="Subtotal" value={formatAmount(q.subtotal)} />
              {q.taxAmount ? <Row label={`Tax (${q.taxRate}%)`} value={formatAmount(q.taxAmount)} /> : null}
              <Row label="Total" value={<span className="font-semibold">{formatAmount(q.totalAmount)}</span>} />
            </div>
          </div>

          {q.notes && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Notes</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {q.notes}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => onEdit(q)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
              >
                <Edit2 size={13} /> Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(q)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors disabled:opacity-60"
            >
              {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Download PDF
            </button>
          </div>
          <div className="flex items-center gap-2">
            {canSend && (
              <button
                onClick={handleSend}
                disabled={updatingStatus}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors disabled:opacity-60"
              >
                {updatingStatus ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send to Customer
              </button>
            )}
            {canDecide && (
              <button
                onClick={handleReject}
                disabled={updatingStatus}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-60"
              >
                <XCircle size={13} /> Reject
              </button>
            )}
            {canDecide && (
              <button
                onClick={handleAccept}
                disabled={updatingStatus}
                className="inline-flex items-center gap-1.5 rounded-xl border border-green-600/40 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-60 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
              >
                {updatingStatus ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Mark Accepted
              </button>
            )}
            {canConvert && (
              <button
                onClick={handleConvert}
                disabled={converting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60"
              >
                {converting ? <Loader2 size={13} className="animate-spin" /> : <ArrowRightLeft size={13} />} Convert to Booking
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
