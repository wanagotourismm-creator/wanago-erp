"use client";

import { Edit2, Trash2, Phone, Mail } from "lucide-react";
import { CustomerTypeBadge } from "@/modules/customers/components/CustomerBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate, initials } from "@/lib/utils/helpers";
import { PhoneLink } from "@/components/shared/PhoneLink";
import { SwipeableRow, type SwipeAction } from "@/components/shared/SwipeableRow";
import type { Customer } from "@/modules/customers/types";

type Props = {
  customers: Customer[];
  loading:   boolean;
  canManage: boolean;
  onView:    (customer: Customer) => void;
  onEdit:    (customer: Customer) => void;
  onDelete:  (customer: Customer) => void;
};

export function CustomersTable({ customers, loading, canManage, onView, onEdit, onDelete }: Props) {
  if (loading) return <SkeletonTable rows={6} />;

  if (customers.length === 0) {
    return (
      <EmptyState
        title="No customers yet"
        description="Add your first customer to get started"
        icon={<span className="text-2xl">🧳</span>}
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
                {["Customer", "Contact", "Type", "City", "Source", "Date", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => onView(customer)}
                  className="cursor-pointer hover:bg-muted/20 transition-colors group"
                >

                  {/* Name + ref */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {initials(customer.fullName)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{customer.fullName}</p>
                        <p className="text-[11px] text-muted-foreground">{customer.refNumber}</p>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      <div className="text-xs text-foreground">
                        <PhoneLink phone={customer.phone} iconSize={11} />
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail size={11} />
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    <CustomerTypeBadge type={customer.customerType} />
                  </td>

                  {/* City */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">{customer.city || "—"}</span>
                  </td>

                  {/* Source */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">{customer.source}</span>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(customer.createdAt)}
                    </span>
                  </td>

                  {/* Actions — inline, revealed on row hover */}
                  <td className="px-4 py-3">
                    {canManage && (
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={(e) => { e.stopPropagation(); onEdit(customer); }}
                          title="Edit"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(customer); }}
                          title="Delete"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
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
      <div className="sm:hidden space-y-2">
        {customers.map((customer) => {
          const actions: SwipeAction[] = [];

          if (customer.phone) {
            actions.push({
              key:       "call",
              icon:      <Phone size={16} />,
              label:     "Call",
              onClick:   () => { window.location.href = `tel:${customer.phone}`; },
              className: "bg-green-600",
            });
          }
          if (canManage) {
            actions.push(
              {
                key:       "edit",
                icon:      <Edit2 size={16} />,
                label:     "Edit",
                onClick:   () => onEdit(customer),
                className: "bg-blue-600",
              },
              {
                key:       "delete",
                icon:      <Trash2 size={16} />,
                label:     "Delete",
                onClick:   () => onDelete(customer),
                className: "bg-red-600",
              }
            );
          }

          return (
            <SwipeableRow
              key={customer.id}
              actions={actions}
              onTap={() => onView(customer)}
              className="rounded-xl border border-border"
            >
              <div className="rounded-xl bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(customer.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{customer.fullName}</p>
                      <p className="text-[11px] text-muted-foreground">{customer.refNumber}</p>
                    </div>
                  </div>
                  <CustomerTypeBadge type={customer.customerType} />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <PhoneLink phone={customer.phone} iconSize={11} />
                  {customer.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={11} />
                      {customer.email}
                    </span>
                  )}
                </div>

                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{customer.city || "—"}</span>
                  <span>·</span>
                  <span>{customer.source}</span>
                  <span>·</span>
                  <span className="whitespace-nowrap">{formatDate(customer.createdAt)}</span>
                </div>
              </div>
            </SwipeableRow>
          );
        })}
      </div>
    </>
  );
}
