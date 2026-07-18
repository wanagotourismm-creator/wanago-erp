"use client";

import { Edit2, Pencil, Phone, Trash2 } from "lucide-react";
import { BookingStatusBadge, formatAmount } from "@/modules/bookings/components/BookingBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { PhoneLink } from "@/components/shared/PhoneLink";
import { SwipeableRow, type SwipeAction } from "@/components/shared/SwipeableRow";
import { formatDate, initials } from "@/lib/utils/helpers";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
import type { Booking } from "@/modules/bookings/types";

type Props = {
  bookings:            Booking[];
  loading:             boolean;
  canManage:           boolean;
  canDelete:           boolean;
  canApprove:          boolean;
  // Set of booking ids (one per going-cold customer's most recent booking —
  // see computeGoingColdCustomers usage in BookingsPage.tsx) to flag with a
  // "going cold" badge next to the customer name.
  goingColdBookingIds: Set<string>;
  onView:              (booking: Booking) => void;
  onEdit:               (booking: Booking) => void;
  onDelete:             (booking: Booking) => void;
  onStatus:             (booking: Booking, status: string) => void;
};

export function BookingsTable({
  bookings, loading, canManage, canDelete, canApprove, goingColdBookingIds,
  onView, onEdit, onDelete, onStatus,
}: Props) {
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
    <>
      {/* Desktop table — unchanged */}
      <div className="hidden sm:block overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Customer", "Trip", "Agent", "Travel Date", "Amount", "Balance", "Status", "Date", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bookings.map((b) => (
              <tr
                key={b.id}
                onClick={() => onView(b)}
                className="cursor-pointer hover:bg-muted/20 transition-colors group"
              >

                {/* Customer + ref */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(b.customerName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-foreground">{b.customerName}</p>
                        {goingColdBookingIds.has(b.id) && (
                          <span title="This customer is overdue for a repeat booking based on their own rhythm">
                            <Badge variant="info">❄ Going cold</Badge>
                          </span>
                        )}
                      </div>
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

                {/* Assigned Agent */}
                <td className="px-4 py-3">
                  {b.agentName ? (
                    <span className="text-xs text-foreground">{b.agentName}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Unassigned</span>
                  )}
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
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col items-start gap-1.5">
                    <BookingStatusBadge status={b.status} />
                    {canApprove && (
                      <select
                        value={b.status}
                        onChange={(e) => onStatus(b, e.target.value)}
                        className="rounded-lg border-0 bg-transparent p-0 text-xs font-medium focus:ring-0 cursor-pointer"
                      >
                        {Object.entries(BOOKING_STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </td>

                {/* Date */}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(b.createdAt)}
                  </span>
                </td>

                {/* Actions — inline, revealed on row hover */}
                <td className="px-4 py-3">
                  {(canManage || canDelete) && (
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {canManage && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onEdit(b); }}
                          title="Edit"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(b); }}
                          title="Delete"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
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

      {/* Mobile card list — swipe left to reveal Call/Edit/Delete */}
      <div className="sm:hidden space-y-2.5">
        {bookings.map((b) => {
          const actions: SwipeAction[] = [
            ...(b.customerPhone ? [{
              key:       "call",
              icon:      <Phone size={16} />,
              label:     "Call",
              onClick:   () => { window.location.href = `tel:${b.customerPhone}`; },
              className: "bg-green-600",
            }] : []),
            ...(canManage ? [{
              key:       "edit",
              icon:      <Pencil size={16} />,
              label:     "Edit",
              onClick:   () => onEdit(b),
              className: "bg-blue-600",
            }] : []),
            ...(canDelete ? [{
              key:       "delete",
              icon:      <Trash2 size={16} />,
              label:     "Delete",
              onClick:   () => onDelete(b),
              className: "bg-red-600",
            }] : []),
          ];

          return (
            <SwipeableRow
              key={b.id}
              actions={actions}
              onTap={() => onView(b)}
              className="rounded-xl border border-border"
            >
              <div className="rounded-xl bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(b.customerName)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate font-medium text-foreground">{b.customerName}</p>
                        {goingColdBookingIds.has(b.id) && <Badge variant="info">❄ Cold</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{b.refNumber}</p>
                    </div>
                  </div>
                  <BookingStatusBadge status={b.status} />
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{b.destination}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {b.pax} pax {b.packageName ? `· ${b.packageName}` : ""}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {b.travelDate ? formatDate(b.travelDate) : "—"}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                  <PhoneLink phone={b.customerPhone} iconSize={12} className="text-xs text-muted-foreground" />
                  <span className={b.balanceAmount > 0 ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>
                    {b.balanceAmount > 0 ? formatAmount(b.balanceAmount) : "Paid"}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Agent: {b.agentName || <span className="italic">Unassigned</span>}
                </div>
              </div>
            </SwipeableRow>
          );
        })}
      </div>
    </>
  );
}
