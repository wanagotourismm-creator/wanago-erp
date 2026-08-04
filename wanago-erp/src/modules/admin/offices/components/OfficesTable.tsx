"use client";

import { Edit2, Trash2, MapPin, Phone, Star } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { SwipeableRow, type SwipeAction } from "@/components/shared/SwipeableRow";
import type { Office } from "@/modules/admin/offices/types";

type Props = {
  offices:  Office[];
  loading:  boolean;
  onView:   (office: Office) => void;
  onEdit:   (office: Office) => void;
  onDelete: (office: Office) => void;
};

export function OfficesTable({ offices, loading, onView, onEdit, onDelete }: Props) {
  if (loading) return <SkeletonTable rows={4} />;

  if (offices.length === 0) {
    return (
      <EmptyState
        title="No offices yet"
        description="Add your first office/branch to get started"
        icon={<span className="text-2xl">🏢</span>}
      />
    );
  }

  return (
    <>
    <div className="hidden lg:block">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {offices.map((office) => (
        <div
          key={office.id}
          onClick={() => onView(office)}
          className="cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground">{office.name}</p>
              {office.isHeadOffice && (
                <span title="Head Office"><Star size={13} className="text-amber-500 fill-amber-500" /></span>
              )}
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {office.code}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-muted-foreground">
            {office.city && (
              <div className="flex items-center gap-1.5">
                <MapPin size={12} />
                <span>{office.address ? `${office.address}, ${office.city}` : office.city}</span>
              </div>
            )}
            {office.phone && (
              <div className="flex items-center gap-1.5">
                <Phone size={12} />
                <span>{office.phone}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(office); }}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Edit2 size={12} /> Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(office); }}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      ))}
    </div>
    </div>

    <div className="lg:hidden space-y-2.5">
      {offices.map((office) => {
        const actions: SwipeAction[] = [
          { key: "edit", icon: <Edit2 size={16} />, label: "Edit", onClick: () => onEdit(office), className: "bg-blue-600" },
          { key: "delete", icon: <Trash2 size={16} />, label: "Delete", onClick: () => onDelete(office), className: "bg-red-600" },
        ];
        return (
          <SwipeableRow key={office.id} actions={actions} onTap={() => onView(office)} className="rounded-xl border border-border">
            <div className="card-compact">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate font-medium text-foreground">{office.name}</p>
                  {office.isHeadOffice && (
                    <span title="Head Office"><Star size={13} className="flex-shrink-0 text-amber-500 fill-amber-500" /></span>
                  )}
                </div>
                <span className="flex-shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {office.code}
                </span>
              </div>
              <div className="mt-2.5 space-y-1 border-t border-border pt-2.5 text-[11px] text-muted-foreground">
                {office.city && (
                  <div className="flex items-center gap-1.5">
                    <MapPin size={11} />
                    <span className="truncate">{office.address ? `${office.address}, ${office.city}` : office.city}</span>
                  </div>
                )}
                {office.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={11} />
                    <span>{office.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </SwipeableRow>
        );
      })}
    </div>
    </>
  );
}
