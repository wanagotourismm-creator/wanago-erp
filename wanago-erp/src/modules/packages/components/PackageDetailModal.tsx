"use client";

import { X, Edit2, Trash2, MapPin, IndianRupee, Package as PackageIcon } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils/helpers";
import type { Package } from "@/modules/packages/types";

type Props = {
  pkg:      Package | null;
  onClose:  () => void;
  onEdit:   (pkg: Package) => void;
  onDelete: (pkg: Package) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function PackageDetailModal({ pkg, onClose, onEdit, onDelete }: Props) {
  if (!pkg) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <PackageIcon size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{pkg.title}</h2>
              <p className="text-xs text-muted-foreground">{pkg.refNumber} · Added {formatDate(pkg.createdAt)}</p>
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
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {pkg.category}
            </span>
            <span className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              pkg.packageStatus === "active"
                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                : "bg-muted text-muted-foreground"
            )}>
              {pkg.packageStatus === "active" ? "Active" : "Inactive"}
            </span>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <MapPin size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Trip Details</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Destination" value={pkg.destination} />
              <Row label="Duration" value={`${pkg.durationDays} days / ${pkg.durationNights} nights`} />
              <Row label="Valid From" value={pkg.validFrom ? formatDate(pkg.validFrom) : null} />
              <Row label="Valid To" value={pkg.validTo ? formatDate(pkg.validTo) : null} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <IndianRupee size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Pricing</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Base Price" value={formatCurrency(pkg.basePrice)} />
              <Row label="Office" value={pkg.officeName} />
            </div>
          </div>

          {pkg.inclusions && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Inclusions</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {pkg.inclusions}
              </p>
            </div>
          )}

          {pkg.exclusions && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Exclusions</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {pkg.exclusions}
              </p>
            </div>
          )}

          {pkg.notes && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Notes</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {pkg.notes}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <button
            onClick={() => onEdit(pkg)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
          >
            <Edit2 size={13} /> Edit
          </button>
          <button
            onClick={() => onDelete(pkg)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>

      </div>
    </div>
  );
}
