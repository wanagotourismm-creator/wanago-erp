"use client";

import { useState } from "react";
import { MoreHorizontal, Edit2, Trash2, Calendar, Phone } from "lucide-react";
import { PaymentStatusBadge, BOOKING_STATUS_OPTIONS } from "@/modules/bookings/components/BookingBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate, formatCurrency, initials } from "@/lib/utils/helpers";
import type { Booking } from "@/modules/bookings/types";

type Props = {
  bookings: Booking[];
  loading: boolean;
  onEdit: (b: Booking) => void;
  onDelete: (b: Booking) => void;
  onStatusChange: (b: Booking, status: string) => void;
};

export function BookingsTable({ bookings, loading, onEdit, onDelete, onStatusChange }: Props) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  if (loading) return <SkeletonTable rows={6} />;
  if (bookings.length === 0) return <EmptyState title="No bookings yet" description="Create your first booking to get started" icon={<span className="text-2xl">📅</span>} />;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Booking","Customer","Destination","Travel Date","Amount","Payment","Status",""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bookings.map(b => (
              <tr key={b.id} className="hover:bg-muted/20 transition-colors group">
                <td className="px-4 py-3">
                  <p className="font-semibold text-foreground text-xs">{b.refNumber}</p>
                  <p className="text-[11px] text-muted-foreground">{b.pax} pax · {b.duration}N</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{initials(b.customerName)}</div>
                    <div>
                      <p className="font-medium text-foreground text-xs">{b.customerName}</p>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><Phone size={10} />{b.customerPhone}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground text-xs">{b.destination}</p>
                  <p className="text-[11px] text-muted-foreground">{b.tripType}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs text-foreground"><Calendar size={11} className="text-muted-foreground" />{formatDate(b.departureDate)}</div>
                  <p className="text-[11px] text-muted-foreground">→ {formatDate(b.returnDate)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-foreground text-xs">{formatCurrency(b.totalAmount)}</p>
                  {b.balanceDue > 0 && <p className="text-[11px] text-destructive">Due: {formatCurrency(b.balanceDue)}</p>}
                </td>
                <td className="px-4 py-3"><PaymentStatusBadge status={b.paymentStatus} /></td>
                <td className="px-4 py-3">
                  <select value={b.bookingStatus} onChange={e => onStatusChange(b, e.target.value)}
                    className="rounded-lg border-0 bg-transparent p-0 text-xs font-medium focus:ring-0 cursor-pointer"
                    onClick={e => e.stopPropagation()}>
                    {BOOKING_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="relative">
                    <button onClick={() => setMenuOpen(menuOpen === b.id ? null : b.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-all">
                      <MoreHorizontal size={15} />
                    </button>
                    {menuOpen === b.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-border bg-card shadow-lg py-1">
                          <button onClick={() => { onEdit(b); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"><Edit2 size={13} /> Edit</button>
                          <button onClick={() => { onDelete(b); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"><Trash2 size={13} /> Delete</button>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
