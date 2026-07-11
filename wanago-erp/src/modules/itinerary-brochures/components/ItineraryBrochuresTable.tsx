"use client";

import { Edit2, Trash2, Copy, MapPin } from "lucide-react";
import { BrochureStatusBadge } from "@/modules/itinerary-brochures/components/BrochureBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { SwipeableRow, type SwipeAction } from "@/components/shared/SwipeableRow";
import { cn } from "@/lib/utils/helpers";
import type { ItineraryBrochure } from "@/modules/itinerary-brochures/types";

type Props = {
  brochures:   ItineraryBrochure[];
  loading:     boolean;
  onView:      (brochure: ItineraryBrochure) => void;
  onEdit:      (brochure: ItineraryBrochure) => void;
  onDelete:    (brochure: ItineraryBrochure) => void;
  onDuplicate: (brochure: ItineraryBrochure) => void;
};

export function ItineraryBrochuresTable({ brochures, loading, onView, onEdit, onDelete, onDuplicate }: Props) {
  if (loading) return <SkeletonTable rows={6} />;

  if (brochures.length === 0) {
    return (
      <EmptyState
        title="No itinerary brochures yet"
        description="Build your first branded trip PDF to get started"
        icon={<MapPin size={22} />}
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
              {["Destination", "Route", "Duration", "Customer", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {brochures.map((brochure) => (
              <tr
                key={brochure.id}
                onClick={() => onView(brochure)}
                className="cursor-pointer hover:bg-muted/20 transition-colors group"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MapPin size={14} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{brochure.destination}</p>
                      <p className="text-[11px] text-muted-foreground">{brochure.refNumber}</p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{brochure.route ?? "—"}</span>
                </td>

                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {brochure.durationDays}D / {brochure.durationNights}N
                  </span>
                </td>

                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{brochure.customerName ?? "—"}</span>
                </td>

                <td className="px-4 py-3">
                  <BrochureStatusBadge status={brochure.brochureStatus} />
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDuplicate(brochure); }}
                      title="Duplicate"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(brochure); }}
                      title="Edit"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(brochure); }}
                      title="Delete"
                      className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors")}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="sm:hidden space-y-2.5">
      {brochures.map((brochure) => {
        const actions: SwipeAction[] = [
          { key: "duplicate", icon: <Copy size={16} />, label: "Copy", onClick: () => onDuplicate(brochure), className: "bg-muted-foreground" },
          { key: "edit", icon: <Edit2 size={16} />, label: "Edit", onClick: () => onEdit(brochure), className: "bg-primary" },
          { key: "delete", icon: <Trash2 size={16} />, label: "Delete", onClick: () => onDelete(brochure), className: "bg-red-600" },
        ];
        return (
          <SwipeableRow key={brochure.id} actions={actions} onTap={() => onView(brochure)} className="rounded-xl border border-border">
            <div className="rounded-xl bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{brochure.destination}</p>
                  <p className="text-[11px] text-muted-foreground">{brochure.refNumber} · {brochure.route ?? "No route set"}</p>
                </div>
                <BrochureStatusBadge status={brochure.brochureStatus} />
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {brochure.durationDays}D / {brochure.durationNights}N
                </span>
                <span className="text-[11px] text-muted-foreground truncate">{brochure.customerName ?? "No customer set"}</span>
              </div>
            </div>
          </SwipeableRow>
        );
      })}
    </div>
    </>
  );
}
