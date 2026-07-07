"use client";

import { useState, useEffect } from "react";
import { X, Mail, MapPin, Edit2, Trash2, User, Briefcase } from "lucide-react";
import { CustomerTypeBadge } from "@/modules/customers/components/CustomerBadges";
import { PhoneLink } from "@/components/shared/PhoneLink";
import { formatDate, formatCurrency, initials } from "@/lib/utils/helpers";
import { fetchBookings } from "@/modules/bookings/services/booking.service";
import { BookingStatusBadge } from "@/modules/bookings/components/BookingBadges";
import { fetchInvoices } from "@/modules/invoices/services/invoice.service";
import { InvoiceStatusBadge } from "@/modules/invoices/components/InvoiceBadges";
import type { Customer } from "@/modules/customers/types";
import type { Booking } from "@/modules/bookings/types";
import type { Invoice } from "@/modules/invoices/types";

type Props = {
  customer:  Customer | null;
  canManage: boolean;
  onClose:   () => void;
  onEdit:    (customer: Customer) => void;
  onDelete:  (customer: Customer) => void;
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

export function CustomerDetailModal({ customer, canManage, onClose, onEdit, onDelete }: Props) {
  const [bookings, setBookings]         = useState<Booking[]>([]);
  const [invoices, setInvoices]         = useState<Invoice[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

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

  if (!customer) return null;

  const totalPendingDues = bookings.reduce((sum, b) => sum + Math.max(b.balanceAmount, 0), 0);

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
              <Row label="Phone" value={<PhoneLink phone={customer.phone} iconSize={12} />} />
              {customer.alternatePhone && <Row label="Alternate Phone" value={customer.alternatePhone} />}
              {customer.email && <Row label="Email" value={<span className="inline-flex items-center gap-1.5"><Mail size={12} />{customer.email}</span>} />}
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
              <button
                onClick={() => onDelete(customer)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
