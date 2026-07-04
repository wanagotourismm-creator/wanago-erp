"use client";

import { useState } from "react";
import { MoreHorizontal, Edit2, Trash2 } from "lucide-react";
import { BookingStatusBadge, formatAmount } from "@/modules/bookings/components/BookingBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate, initials } from "@/lib/utils/helpers";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
import type { Booking } from "@/modules/bookings/types";

type Props = {
  bookings:   Booking[];
  loading:    boolean;
  canManage:  boolean;
  canApprove: boolean;
  onEdit:     (booking: Booking) => void;
  onDelete:   (booking: Booking) => void;
  onStatus:   (booking: Booking, status: string) => void;
};

export function BookingsTable({ bookings, loading, canManage, canApprove, onEdit, onDelete, onStatus }: Props) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  if (loading) return <SkeletonTable rows={6} />;

  if (bookings.length === 0) {
    return (
      <EmptyState
        title="No bookings yet"
        description="Create your first booking to get started"
        icon={<span className="text-2xl">🧾</span>}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Customer", "Trip", "Travel Date", "Amount", "Balance", "Status", "Date", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-muted/20 transition-colors group">

                {/* Customer + ref */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(b.customerName)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{b.customerName}</p>
                      <p className="text-[11px] text-muted-foreground">{b.refNumber}</p>
                    </div>
                  </div>
                </td>

                {/* Trip */}
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{b.destination}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {b.pax} pax {b.packageName ? `· ${b.packageName}` : ""}
                    </p>
                  </div>
                </td>

                {/* Travel Date */}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {b.travelDate ? formatDate(b.travelDate) : "—"}
                  </span>
                </td>

                {/* Amount */}
                <td className="px-4 py-3">
                  <span className="text-xs text-foreground">{formatAmount(b.totalAmount)}</span>
                </td>

                {/* Balance */}
                <td className="px-4 py-3">
                  <span className={b.balanceAmount > 0 ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>
                    {b.balanceAmount > 0 ? formatAmount(b.balanceAmount) : "Paid"}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  {canApprove ? (
                    <select
                      value={b.status}
                      onChange={(e) => onStatus(b, e.target.value)}
                      className="rounded-lg border-0 bg-transparent p-0 text-xs font-medium focus:ring-0 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {Object.entries(BOOKING_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  ) : (
                    <BookingStatusBadge status={b.status} />
                  )}
                </td>

                {/* Date */}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(b.createdAt)}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  {canManage && (
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === b.id ? null : b.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <MoreHorizontal size={15} />
                      </button>

                      {menuOpen === b.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-border bg-card shadow-lg py-1">
                            <button
                              onClick={() => { onEdit(b); setMenuOpen(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                            <button
                              onClick={() => { onDelete(b); setMenuOpen(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
