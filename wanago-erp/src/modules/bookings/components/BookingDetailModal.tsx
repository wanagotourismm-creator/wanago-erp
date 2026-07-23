"use client";

import { useState, useEffect } from "react";
import { X, MapPin, Edit2, Trash2, Wallet, User, ShieldCheck } from "lucide-react";
import { BookingStatusBadge, formatAmount } from "@/modules/bookings/components/BookingBadges";
import { PhoneLink } from "@/components/shared/PhoneLink";
import { formatDate, formatDateTime, initials } from "@/lib/utils/helpers";
import { BOOKING_STATUS_LABELS, MANUALLY_SETTABLE_BOOKING_STATUSES } from "@/lib/constants";
import { fetchCompanySettings, DEFAULT_COMPANY_SETTINGS, type CompanySettings } from "@/modules/admin/settings/services/company-settings.service";
import { UpiPaymentPanel } from "@/components/shared/UpiPaymentPanel";
import { BookingResourcesSection } from "@/modules/resources/components/BookingResourcesSection";
import { BookingSosHistory } from "@/modules/companion/components/BookingSosHistory";
import { TripProfitabilitySection } from "@/modules/profitability/components/TripProfitabilitySection";
import type { Booking } from "@/modules/bookings/types";

type Props = {
  booking:           Booking | null;
  canManage:         boolean;
  canDelete:         boolean;
  canApprove:        boolean;
  onClose:           () => void;
  onEdit:            (booking: Booking) => void;
  onDelete:          (booking: Booking) => void;
  onStatus:          (booking: Booking, status: string) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function BookingDetailModal({
  booking, canManage, canDelete, canApprove,
  onClose, onEdit, onDelete, onStatus,
}: Props) {
  const [companySettings, setCompanySettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);

  useEffect(() => {
    if (!booking) return;
    fetchCompanySettings().then(setCompanySettings).catch(() => {});
  }, [booking?.id]);

  if (!booking) return null;

  const hasApprovalTrail = !!booking.financeApprovedBy || !!booking.opsApprovedBy
    || !!booking.financeRejectedAt || !!booking.opsRejectedAt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {initials(booking.customerName)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{booking.customerName}</h2>
              <p className="text-xs text-muted-foreground">{booking.refNumber} · Added {formatDate(booking.createdAt)}</p>
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
            <BookingStatusBadge status={booking.status} />
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <User size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Contact</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Phone" value={<PhoneLink phone={booking.customerPhone} iconSize={12} />} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <MapPin size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Trip Details</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Destination" value={booking.destination} />
              <Row label="Trip Type" value={booking.tripType} />
              <Row label="Package" value={booking.packageName} />
              <Row label="No. of Pax" value={booking.pax} />
              <Row label="Travel Date" value={booking.travelDate ? formatDate(booking.travelDate) : null} />
              <Row label="Return Date" value={booking.returnDate ? formatDate(booking.returnDate) : null} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Wallet size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Payment</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Total Amount" value={formatAmount(booking.totalAmount)} />
              <Row label="Advance Paid" value={formatAmount(booking.advanceAmount)} />
              <Row
                label="Balance"
                value={
                  <span className={booking.balanceAmount > 0 ? "text-destructive" : ""}>
                    {booking.balanceAmount > 0 ? formatAmount(booking.balanceAmount) : "Paid"}
                  </span>
                }
              />
            </div>
          </div>

          {booking.balanceAmount > 0 && (
            <UpiPaymentPanel
              upiId={companySettings.upiId}
              payeeName={companySettings.businessName}
              amount={booking.balanceAmount}
              note={`Booking ${booking.refNumber}`}
              refId={booking.refNumber}
            />
          )}

          <BookingResourcesSection booking={booking} />
          <BookingSosHistory bookingId={booking.id} />
          <TripProfitabilitySection booking={booking} />

          <div>
            <div className="mb-1 flex items-center gap-2">
              <User size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Pipeline</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Agent" value={booking.agentName} />
              <Row label="Office" value={booking.officeName} />
            </div>
          </div>

          {hasApprovalTrail && (
            <div>
              <div className="mb-1 flex items-center gap-2">
                <ShieldCheck size={13} className="text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Approvals</p>
              </div>
              <div className="divide-y divide-border rounded-xl border border-border px-3">
                {booking.financeApprovedBy && <Row label="Finance Approved By" value={booking.financeApprovedBy} />}
                {booking.financeApprovedAt && <Row label="Finance Approved At" value={formatDateTime(booking.financeApprovedAt as never)} />}
                {booking.paymentVerification && <Row label="Payment Verification" value={booking.paymentVerification === "full" ? "Full amount received" : "Partial advance received"} />}
                {booking.opsApprovedBy && <Row label="Ops Approved By" value={booking.opsApprovedBy} />}
                {booking.opsApprovedAt && <Row label="Ops Approved At" value={formatDateTime(booking.opsApprovedAt as never)} />}
                {booking.profitAmount != null && <Row label="Profit Recorded" value={formatAmount(booking.profitAmount)} />}
                {booking.financeRejectedAt && (
                  <Row
                    label="Rejected by Finance"
                    value={<span className="text-destructive">{booking.financeRejectionReason ?? "No reason given"}</span>}
                  />
                )}
                {booking.opsRejectedAt && (
                  <Row
                    label="Rejected by Operations"
                    value={<span className="text-destructive">{booking.opsRejectionReason ?? "No reason given"}</span>}
                  />
                )}
              </div>
            </div>
          )}

          {booking.notes && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Notes</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {booking.notes}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                onClick={() => onEdit(booking)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
              >
                <Edit2 size={13} /> Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(booking)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
          {canApprove && (
            <select
              value={booking.status}
              onChange={(e) => onStatus(booking, e.target.value)}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              {[...new Set([booking.status, ...MANUALLY_SETTABLE_BOOKING_STATUSES])].map((k) => (
                <option key={k} value={k}>{BOOKING_STATUS_LABELS[k]}</option>
              ))}
            </select>
          )}
        </div>

      </div>
    </div>
  );
}
