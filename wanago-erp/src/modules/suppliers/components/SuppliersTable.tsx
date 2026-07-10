"use client";

import { Edit2, Trash2, Phone, Mail } from "lucide-react";
import { SupplierCategoryBadge, SupplierStatusBadge } from "@/modules/suppliers/components/SupplierBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { SwipeableRow, type SwipeAction } from "@/components/shared/SwipeableRow";
import { initials } from "@/lib/utils/helpers";
import type { Supplier } from "@/modules/suppliers/types";

type Props = {
  suppliers: Supplier[];
  loading:   boolean;
  canManage: boolean;
  onView:    (supplier: Supplier) => void;
  onEdit:    (supplier: Supplier) => void;
  onDelete:  (supplier: Supplier) => void;
};

export function SuppliersTable({ suppliers, loading, canManage, onView, onEdit, onDelete }: Props) {
  if (loading) return <SkeletonTable rows={6} />;

  if (suppliers.length === 0) {
    return (
      <EmptyState
        title="No suppliers yet"
        description="Add your first supplier to get started"
        icon={<span className="text-2xl">🚚</span>}
      />
    );
  }

  return (
    <>
    <div className="hidden sm:block overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Name", "Category", "Contact Person", "Phone", "City", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {suppliers.map((supplier) => (
              <tr
                key={supplier.id}
                onClick={() => onView(supplier)}
                className="cursor-pointer hover:bg-muted/20 transition-colors group"
              >

                {/* Name + ref */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(supplier.name)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{supplier.name}</p>
                      <p className="text-[11px] text-muted-foreground">{supplier.refNumber}</p>
                    </div>
                  </div>
                </td>

                {/* Category */}
                <td className="px-4 py-3">
                  <SupplierCategoryBadge category={supplier.category} />
                </td>

                {/* Contact Person */}
                <td className="px-4 py-3">
                  <span className="text-xs text-foreground">{supplier.contactPerson}</span>
                </td>

                {/* Phone */}
                <td className="px-4 py-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-xs text-foreground">
                      <Phone size={11} className="text-muted-foreground" />
                      {supplier.phone}
                    </div>
                    {supplier.email && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail size={11} />
                        {supplier.email}
                      </div>
                    )}
                  </div>
                </td>

                {/* City */}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{supplier.city || "—"}</span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <SupplierStatusBadge status={supplier.supplierStatus} />
                </td>

                {/* Actions — inline, revealed on row hover */}
                <td className="px-4 py-3">
                  {canManage && (
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(supplier); }}
                        title="Edit"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(supplier); }}
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

    <div className="sm:hidden space-y-2.5">
      {suppliers.map((supplier) => {
        const actions: SwipeAction[] = canManage ? [
          { key: "edit", icon: <Edit2 size={16} />, label: "Edit", onClick: () => onEdit(supplier), className: "bg-blue-600" },
          { key: "delete", icon: <Trash2 size={16} />, label: "Delete", onClick: () => onDelete(supplier), className: "bg-red-600" },
        ] : [];
        return (
          <SwipeableRow key={supplier.id} actions={actions} onTap={() => onView(supplier)} className="rounded-xl border border-border">
            <div className="rounded-xl bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initials(supplier.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{supplier.name}</p>
                    <p className="text-[11px] text-muted-foreground">{supplier.refNumber}</p>
                  </div>
                </div>
                <SupplierStatusBadge status={supplier.supplierStatus} />
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                <SupplierCategoryBadge category={supplier.category} />
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone size={11} /> {supplier.phone}
                </span>
              </div>
            </div>
          </SwipeableRow>
        );
      })}
    </div>
    </>
  );
}
