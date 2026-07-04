"use client";

import { Edit2, Trash2, MapPin, Phone, Star } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import type { Office } from "@/modules/admin/offices/types";

type Props = {
  offices:  Office[];
  loading:  boolean;
  onEdit:   (office: Office) => void;
  onDelete: (office: Office) => void;
};

export function OfficesTable({ offices, loading, onEdit, onDelete }: Props) {
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {offices.map((office) => (
        <div key={office.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
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
              onClick={() => onEdit(office)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Edit2 size={12} /> Edit
            </button>
            <button
              onClick={() => onDelete(office)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
