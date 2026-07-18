"use client";

import { useState, useEffect } from "react";
import { X, Mail, MapPin, Edit2, Trash2, User, Briefcase, PhoneCall, MessageCircle, History, Gift, Copy, Check, FileText } from "lucide-react";
import { CustomerTypeBadge, CustomerSegmentBadge } from "@/modules/customers/components/CustomerBadges";
import { computeCustomerSegment } from "@/modules/customers/utils/segment";
import { PhoneLink } from "@/components/shared/PhoneLink";
import { formatDate, formatCurrency, initials, buildWhatsAppLink, toDate } from "@/lib/utils/helpers";
import { fetchBookings } from "@/modules/bookings/services/booking.service";
import { BookingStatusBadge } from "@/modules/bookings/components/BookingBadges";
import { fetchInvoices } from "@/modules/invoices/services/invoice.service";
import { InvoiceStatusBadge } from "@/modules/invoices/components/InvoiceBadges";
import { fetchLeads } from "@/modules/leads/services/lead.service";
import { StageBadge } from "@/modules/leads/components/LeadBadges";
import { BOOKING_STATUS } from "@/lib/constants";
import { useCallLogs } from "@/modules/call-logs/hooks/useCallLogs";
import { CallLogForm } from "@/modules/call-logs/components/CallLogForm";
import { CallLogHistory } from "@/modules/call-logs/components/CallLogHistory";
import { fetchReferralSettings, fetchReferralBonusesForCustomer } from "@/modules/referrals/services/referral.service";
import { ReferralBonusStatusBadge } from "@/modules/referrals/components/ReferralBonusBadge";
import type { Customer } from "@/modules/customers/types";
import type { Booking } from "@/modules/bookings/types";
import type { Invoice } from "@/modules/invoices/types";
import type { Lead } from "@/modules/leads/types";
import type { ReferralBonus } from "@/modules/referrals/types";
import type { CallLogSchema } from "@/modules/call-logs/schemas";
import type { CallMethod, CallDirection } from "@/modules/call-logs/types";

type Props = {
  customer:  Customer | null;
  canManage: boolean;
  canDelete: boolean;
  onClose:   () => void;
  onEdit:    (customer: Customer) => void;
  onDelete:  (customer: Customer) => void;
  onCreateQuotation: (customer: Customer) => void;
};

function paymentBadgeFor(booking: Booking, invoices: Invoice[]) {
  const invoice = invoices.find((inv) => inv.bookingId === booking.id);
  if (invoice) return <InvoiceStatusBadge status={invoice.status} />;

  if (booking.balanceAmount <= 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
        Paid
      </span>
    );
  }
  if (booking.balanceAmount > 0 && booking.advanceAmount > 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
        Partially Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      Unpaid
    </span>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function CustomerDetailModal({ customer, canManage, canDelete, onClose, onEdit, onDelete, onCreateQuotation }: Props) {
  const [bookings, setBookings]         = useState<Booking[]>([]);
  const [invoices, setInvoices]         = useState<Invoice[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [enquiries, setEnquiries]       = useState<Lead[]>([]);
  const [loadingEnquiries, setLoadingEnquiries] = useState(false);
  const [referralEnabled, setReferralEnabled] = useState(false);
  const [earnedBonuses, setEarnedBonuses] = useState<ReferralBonus[]>([]);
  const [codeCopied, setCodeCopied] = useState(false);

  const [callFormOpen, setCallFormOpen] = useState(false);
  const [callPrefill, setCallPrefill] = useState<{ method: CallMethod; direction: CallDirection }>({
    method: "phone",
    direction: "outbound",
  });
  const [callLogRefreshKey, setCallLogRefreshKey] = useState(0);

  const { addCallLog } = useCallLogs({ customerId: customer?.id });

  useEffect(() => {
    if (!customer) { setBookings([]); setInvoices([]); return; }
    let cancelled = false;
    setLoadingBookings(true);
    Promise.all([fetchBookings({ customerId: customer.id }), fetchInvoices()])
      .then(([b, i]) => {
        if (cancelled) return;
        setBookings(b);
        setInvoices(i);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingBookings(false); });
    return () => { cancelled = true; };
  }, [customer?.id]);

  // Every past Lead matched to this Customer by phone — the "track record"
  // of how many times this person has enquired, whether or not each
  // enquiry ever turned into a booking.
  useEffect(() => {
    if (!customer) { setEnquiries([]); return; }
    let cancelled = false;
    setLoadingEnquiries(true);
    fetchLeads({ matchedCustomerId: customer.id })
      .then((leads) => { if (!cancelled) setEnquiries(leads); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingEnquiries(false); });
    return () => { cancelled = true; };
  }, [customer?.id]);

  useEffect(() => {
    if (!customer) { setEarnedBonuses([]); return; }
    let cancelled = false;
    fetchReferralSettings().then((s) => { if (!cancelled) setReferralEnabled(s.enabled); }).catch(() => {});
    fetchReferralBonusesForCustomer(customer.id).then((b) => { if (!cancelled) setEarnedBonuses(b); }).catch(() => {});
    return () => { cancelled = true; };
  }, [customer?.id]);

  if (!customer) return null;

  function copyReferralCode() {
    if (!customer?.referralCode) return;
    navigator.clipboard.writeText(customer.referralCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1500);
    }).catch(() => {});
  }

  const totalPendingDues = bookings.reduce((sum, b) => sum + Math.max(b.balanceAmount, 0), 0);

  const confirmedBookings = bookings.filter(b => b.status === BOOKING_STATUS.CONFIRMED || b.status === BOOKING_STATUS.COMPLETED);
  const lastActivityAt = [...enquiries.map(e => toDate(e.createdAt)), ...bookings.map(b => toDate(b.createdAt))]
    .filter((d): d is Date => !!d)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const segment = computeCustomerSegment({
    enquiryCount:      enquiries.length,
    bookingCount:      confirmedBookings.length,
    totalBookingValue: confirmedBookings.reduce((sum, b) => sum + b.totalAmount, 0),
    lastActivityAt,
  });

  function openLogCallForm() {
    setCallPrefill({ method: "phone", direction: "outbound" });
    setCallFormOpen(true);
  }

  function confirmAndLogCall(method: CallMethod) {
    if (window.confirm("Log this call?")) {
      setCallPrefill({ method, direction: "outbound" });
      setCallFormOpen(true);
    }
  }

  async function handleLogCall(data: CallLogSchema, recordingFile: File | null) {
    if (!customer) return;
    const { error } = await addCallLog(
      {
        ...data,
        customerId: customer.id,
        leadId: null,
        contactName: customer.fullName,
        phone: customer.phone,
        durationMinutes: data.durationMinutes ?? null,
        notes: data.notes || null,
        followUpDate: data.followUpDate || null,
      },
      recordingFile
    );
    if (!error) {
      setCallLogRefreshKey((k) => k + 1);
    }
    setCallFormOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {initials(customer.fullName)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{customer.fullName}</h2>
              <p className="text-xs text-muted-foreground">{customer.refNumber} · Added {formatDate(customer.createdAt)}</p>
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
            <CustomerTypeBadge type={customer.customerType} />
            <CustomerSegmentBadge segment={segment} />
            {customer.source && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {customer.source}
              </span>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <User size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Contact</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row
                label="Phone"
                value={
                  <span onClick={() => confirmAndLogCall("phone")}>
                    <PhoneLink phone={customer.phone} iconSize={12} />
                  </span>
                }
              />
              {customer.alternatePhone && <Row label="Alternate Phone" value={customer.alternatePhone} />}
              {customer.email && <Row label="Email" value={<span className="inline-flex items-center gap-1.5"><Mail size={12} />{customer.email}</span>} />}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={openLogCallForm}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
              >
                <PhoneCall size={12} /> Log a Call
              </button>
              {customer.phone && (
                <a
                  href={buildWhatsAppLink(customer.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => confirmAndLogCall("whatsapp")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
                >
                  <MessageCircle size={12} /> Call via WhatsApp
                </a>
              )}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <MapPin size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Location</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="City" value={customer.city} />
              <Row label="Address" value={customer.address} />
              <Row label="Office" value={customer.officeName} />
              {customer.agentName && <Row label="Assigned Agent" value={customer.agentName} />}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Briefcase size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Bookings & Payments</p>
            </div>
            {loadingBookings ? (
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">Loading…</p>
            ) : bookings.length === 0 ? (
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">No bookings yet</p>
            ) : (
              <>
                <div className="divide-y divide-border rounded-xl border border-border px-3">
                  {bookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{b.destination}</p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="text-[11px] text-muted-foreground">{b.refNumber}</span>
                          <BookingStatusBadge status={b.status} />
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-1">
                        {paymentBadgeFor(b, invoices)}
                        <span className="text-[11px] text-muted-foreground">
                          {b.balanceAmount > 0 ? `${formatCurrency(b.balanceAmount)} due` : "Paid"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {totalPendingDues > 0 && (
                  <p className="mt-2 text-xs font-medium text-destructive">
                    Total pending dues: {formatCurrency(totalPendingDues)}
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <History size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Enquiry History</p>
            </div>
            {loadingEnquiries ? (
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">Loading…</p>
            ) : enquiries.length === 0 ? (
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">No past enquiries on record</p>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border px-3">
                {enquiries.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{lead.destination}</p>
                      <p className="text-[11px] text-muted-foreground">{lead.refNumber} · {formatDate(lead.createdAt)}</p>
                    </div>
                    <StageBadge stage={lead.stage} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {referralEnabled && (
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Gift size={13} className="text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Referral</p>
              </div>
              <div className="divide-y divide-border rounded-xl border border-border px-3">
                <Row
                  label="Referral Code"
                  value={
                    customer.referralCode ? (
                      <button
                        onClick={copyReferralCode}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 font-mono text-xs hover:border-primary/40 hover:bg-muted transition-colors"
                      >
                        {customer.referralCode}
                        {codeCopied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                      </button>
                    ) : null
                  }
                />
                {earnedBonuses.length > 0 && (
                  <Row label="Referrals Made" value={`${earnedBonuses.length}`} />
                )}
              </div>
              {earnedBonuses.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {earnedBonuses.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{b.referredCustomerName}</p>
                        <p className="text-[11px] text-muted-foreground">{b.bookingRefNumber} · {formatCurrency(b.bonusAmount)}</p>
                      </div>
                      <ReferralBonusStatusBadge status={b.bonusStatus} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <CallLogHistory key={callLogRefreshKey} customerId={customer.id} />

          {customer.notes && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Notes</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {customer.notes}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        {canManage && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(customer)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
              >
                <Edit2 size={13} /> Edit
              </button>
              {canDelete && (
                <button
                  onClick={() => onDelete(customer)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={13} /> Delete
                </button>
              )}
            </div>
            <button
              onClick={() => onCreateQuotation(customer)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/70 transition-colors"
            >
              <FileText size={13} /> Create Quotation
            </button>
          </div>
        )}

      </div>

      <CallLogForm
        open={callFormOpen}
        onClose={() => setCallFormOpen(false)}
        onSubmit={handleLogCall}
        contactName={customer.fullName}
        phone={customer.phone}
        customerId={customer.id}
        prefillMethod={callPrefill.method}
        prefillDirection={callPrefill.direction}
      />
    </div>
  );
}
