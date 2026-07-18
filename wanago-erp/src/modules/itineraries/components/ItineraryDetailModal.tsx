"use client";

import { X, MapPin, Edit2, Trash2, CalendarDays, StickyNote, Building2 } from "lucide-react";
import { ItineraryStatusBadge } from "@/modules/itineraries/components/ItineraryBadges";
import { formatDate } from "@/lib/utils/helpers";
import type { Itinerary } from "@/modules/itineraries/types";

type Props = {
  itinerary: Itinerary | null;
  onClose:   () => void;
  onEdit:    (itinerary: Itinerary) => void;
  onDelete:  (itinerary: Itinerary) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function ItineraryDetailModal({ itinerary, onClose, onEdit, onDelete }: Props) {
  if (!itinerary) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MapPin size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{itinerary.title}</h2>
              <p className="text-xs text-muted-foreground">{itinerary.refNumber} · Added {formatDate(itinerary.createdAt)}</p>
              {itinerary.tagline && <p className="mt-0.5 truncate text-xs italic text-primary">{itinerary.tagline}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">

          <div className="flex flex-wrap items-center gap-2">
            <ItineraryStatusBadge status={itinerary.itineraryStatus} />
            {itinerary.packageName && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {itinerary.packageName}
              </span>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <MapPin size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Trip Details</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Destination" value={itinerary.destination} />
              <Row label="Duration" value={`${itinerary.durationDays} day${itinerary.durationDays !== 1 ? "s" : ""}`} />
              <Row label="Package" value={itinerary.packageName} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Building2 size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Office</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Office" value={itinerary.officeName} />
            </div>
          </div>

          {/* Day-by-day plan */}
          <div>
            <div className="mb-1 flex items-center gap-2">
              <CalendarDays size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Day-by-Day Plan</p>
            </div>
            {itinerary.days.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                No day-by-day plan added yet
              </p>
            ) : (
              <div className="space-y-2">
                {[...itinerary.days]
                  .sort((a, b) => a.dayNumber - b.dayNumber)
                  .map((day) => (
                    <div key={day.dayNumber} className="rounded-xl border border-border p-3">
                      <p className="text-sm font-semibold text-foreground">
                        Day {day.dayNumber}{day.title ? `: ${day.title}` : ""}
                      </p>
                      {day.description && (
                        <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{day.description}</p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {(itinerary.inclusions.length > 0 || itinerary.exclusions.length > 0) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {itinerary.inclusions.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">Inclusions</p>
                  <ul className="rounded-xl border border-border px-3 py-2 text-xs text-foreground space-y-1">
                    {itinerary.inclusions.map((item, i) => <li key={i}>• {item}</li>)}
                  </ul>
                </div>
              )}
              {itinerary.exclusions.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">Exclusions</p>
                  <ul className="rounded-xl border border-border px-3 py-2 text-xs text-foreground space-y-1">
                    {itinerary.exclusions.map((item, i) => <li key={i}>• {item}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {itinerary.notes && (
            <div>
              <div className="mb-1 flex items-center gap-2">
                <StickyNote size={13} className="text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Notes</p>
              </div>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {itinerary.notes}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(itinerary)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
            >
              <Edit2 size={13} /> Edit
            </button>
            <button
              onClick={() => onDelete(itinerary)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
