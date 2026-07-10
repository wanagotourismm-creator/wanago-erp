"use client";

import { Edit2, Trash2, MapPin } from "lucide-react";
import { ItineraryStatusBadge } from "@/modules/itineraries/components/ItineraryBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { SwipeableRow, type SwipeAction } from "@/components/shared/SwipeableRow";
import { cn } from "@/lib/utils/helpers";
import type { Itinerary } from "@/modules/itineraries/types";

type Props = {
  itineraries: Itinerary[];
  loading:     boolean;
  onView:      (itinerary: Itinerary) => void;
  onEdit:      (itinerary: Itinerary) => void;
  onDelete:    (itinerary: Itinerary) => void;
};

export function ItinerariesTable({ itineraries, loading, onView, onEdit, onDelete }: Props) {
  if (loading) return <SkeletonTable rows={6} />;

  if (itineraries.length === 0) {
    return (
      <EmptyState
        title="No itineraries yet"
        description="Add your first day-by-day trip plan to get started"
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
              {["Title", "Destination", "Duration", "Package", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {itineraries.map((itinerary) => (
              <tr
                key={itinerary.id}
                onClick={() => onView(itinerary)}
                className="cursor-pointer hover:bg-muted/20 transition-colors group"
              >

                {/* Title + ref */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MapPin size={14} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{itinerary.title}</p>
                      <p className="text-[11px] text-muted-foreground">{itinerary.refNumber}</p>
                    </div>
                  </div>
                </td>

                {/* Destination */}
                <td className="px-4 py-3">
                  <span className="text-foreground">{itinerary.destination}</span>
                </td>

                {/* Duration */}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {itinerary.durationDays} day{itinerary.durationDays !== 1 ? "s" : ""}
                  </span>
                </td>

                {/* Package */}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{itinerary.packageName ?? "—"}</span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <ItineraryStatusBadge status={itinerary.itineraryStatus} />
                </td>

                {/* Actions — inline, same line, revealed on row hover */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(itinerary); }}
                      title="Edit"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(itinerary); }}
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
      {itineraries.map((itinerary) => {
        const actions: SwipeAction[] = [
          { key: "edit", icon: <Edit2 size={16} />, label: "Edit", onClick: () => onEdit(itinerary), className: "bg-primary" },
          { key: "delete", icon: <Trash2 size={16} />, label: "Delete", onClick: () => onDelete(itinerary), className: "bg-red-600" },
        ];
        return (
          <SwipeableRow key={itinerary.id} actions={actions} onTap={() => onView(itinerary)} className="rounded-xl border border-border">
            <div className="rounded-xl bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{itinerary.title}</p>
                  <p className="text-[11px] text-muted-foreground">{itinerary.refNumber} · {itinerary.destination}</p>
                </div>
                <ItineraryStatusBadge status={itinerary.itineraryStatus} />
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {itinerary.durationDays} day{itinerary.durationDays !== 1 ? "s" : ""}
                </span>
                <span className="text-[11px] text-muted-foreground truncate">{itinerary.packageName ?? "No package"}</span>
              </div>
            </div>
          </SwipeableRow>
        );
      })}
    </div>
    </>
  );
}
