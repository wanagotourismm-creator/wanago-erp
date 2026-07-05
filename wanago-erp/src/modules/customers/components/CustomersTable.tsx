"use client";

import { Edit2, Trash2, Phone, Mail } from "lucide-react";
import { CustomerTypeBadge } from "@/modules/customers/components/CustomerBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate, initials } from "@/lib/utils/helpers";
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
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
                    <div className="flex items-center gap-1 text-xs text-foreground">
                      <Phone size={11} className="text-muted-foreground" />
                      {customer.phone}
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
  );
}
