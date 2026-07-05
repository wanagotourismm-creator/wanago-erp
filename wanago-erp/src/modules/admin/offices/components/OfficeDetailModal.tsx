"use client";

import { X, MapPin, Phone, Star, Edit2, Trash2, Building2 } from "lucide-react";
import type { Office } from "@/modules/admin/offices/types";

type Props = {
  office:   Office | null;
  onClose:  () => void;
  onEdit:   (office: Office) => void;
  onDelete: (office: Office) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function OfficeDetailModal({ office, onClose, onEdit, onDelete }: Props) {
  if (!office) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              <Building2 size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-base font-semibold text-foreground">{office.name}</h2>
                {office.isHeadOffice && (
                  <span title="Head Office"><Star size={13} className="text-amber-500 fill-amber-500" /></span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{office.code}</p>
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
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {office.code}
            </span>
            {office.isHeadOffice && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Star size={11} className="fill-amber-500 text-amber-500" /> Head Office
              </span>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <MapPin size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Location</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Address" value={office.address} />
              <Row label="City" value={office.city} />
              <Row label="Phone" value={office.phone && <span className="inline-flex items-center gap-1.5"><Phone size={12} />{office.phone}</span>} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <MapPin size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Geofence</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Latitude" value={office.latitude} />
              <Row label="Longitude" value={office.longitude} />
              <Row label="Radius" value={office.geofenceRadiusMeters ? `${office.geofenceRadiusMeters} m` : null} />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button
            onClick={() => onEdit(office)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
          >
            <Edit2 size={13} /> Edit
          </button>
          <button
            onClick={() => onDelete(office)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>

      </div>
    </div>
  );
}
