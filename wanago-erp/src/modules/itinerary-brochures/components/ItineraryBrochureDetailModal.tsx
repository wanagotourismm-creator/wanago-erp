"use client";

import { useState } from "react";
import Image from "next/image";
import { X, MapPin, Edit2, Trash2, Copy, CalendarDays, ListChecks, FileText, Phone, Download, RefreshCw, Loader2 } from "lucide-react";
import { BrochureStatusBadge } from "@/modules/itinerary-brochures/components/BrochureBadges";
import { formatDate } from "@/lib/utils/helpers";
import type { ItineraryBrochure } from "@/modules/itinerary-brochures/types";

type Props = {
  brochure:      ItineraryBrochure | null;
  onClose:       () => void;
  onEdit:        (brochure: ItineraryBrochure) => void;
  onDelete:      (brochure: ItineraryBrochure) => void;
  onDuplicate:   (brochure: ItineraryBrochure) => void;
  onGeneratePdf: (id: string) => Promise<{ pdfUrl: string | null; error: string | null }>;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function ItineraryBrochureDetailModal({ brochure, onClose, onEdit, onDelete, onDuplicate, onGeneratePdf }: Props) {
  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState<string | null>(null);

  if (!brochure) return null;

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    const { error } = await onGeneratePdf(brochure!.id);
    if (error) setGenError(error);
    setGenerating(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            {brochure.coverImageUrl ? (
              <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full border border-border">
                <Image src={brochure.coverImageUrl} alt="" fill className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MapPin size={18} />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{brochure.destination}</h2>
              <p className="text-xs text-muted-foreground">{brochure.refNumber} · Added {formatDate(brochure.createdAt)}</p>
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
            <BrochureStatusBadge status={brochure.brochureStatus} />
            {brochure.route && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {brochure.route}
              </span>
            )}
          </div>

          {/* PDF actions */}
          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-foreground">Brochure PDF</p>
                <p className="text-[11px] text-muted-foreground">
                  {generating
                    ? "Generating — this can take a few seconds..."
                    : brochure.pdfUrl
                      ? `Generated ${brochure.pdfGeneratedAt ? formatDate(brochure.pdfGeneratedAt) : ""}`
                      : "No PDF generated yet for this brochure."}
                </p>
                {genError && <p className="text-[11px] text-destructive font-medium mt-0.5">{genError}</p>}
              </div>
              <div className="flex items-center gap-2">
                {brochure.pdfUrl && (
                  <a
                    href={brochure.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
                  >
                    <Download size={13} /> Download
                  </a>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted disabled:opacity-60 transition-colors"
                >
                  {generating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  {brochure.pdfUrl ? "Regenerate" : "Generate PDF"}
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <MapPin size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Trip Details</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Duration" value={`${brochure.durationDays}D / ${brochure.durationNights}N`} />
              <Row label="Tagline" value={brochure.tagline} />
              <Row label="Customer" value={brochure.customerName} />
              <Row label="Package Price" value={brochure.packagePrice ? `₹${brochure.packagePrice.toLocaleString("en-IN")}` : null} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <CalendarDays size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Day-by-Day Plan</p>
            </div>
            {brochure.days.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                No day-by-day plan added yet
              </p>
            ) : (
              <div className="space-y-2">
                {[...brochure.days]
                  .sort((a, b) => a.dayNumber - b.dayNumber)
                  .map((day) => (
                    <div key={day.dayNumber} className="rounded-xl border border-border p-3">
                      <p className="text-sm font-semibold text-foreground">
                        Day {day.dayNumber}{day.title ? `: ${day.title}` : ""}
                      </p>
                      {day.bulletPoints.length > 0 && (
                        <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                          {day.bulletPoints.map((point, i) => <li key={i}>{point}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <ListChecks size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Inclusions &amp; Exclusions</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-3">
                <p className="mb-1.5 text-xs font-semibold text-foreground">Inclusions</p>
                <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                  {brochure.inclusions.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="mb-1.5 text-xs font-semibold text-foreground">Exclusions</p>
                <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                  {brochure.exclusions.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Phone size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Contact &amp; Offices</p>
            </div>
            <div className="rounded-xl border border-border p-3 text-xs text-muted-foreground space-y-1">
              {brochure.contactPhones.map((phone, i) => <p key={i}>{phone}</p>)}
              {brochure.officeAddresses.map((addr, i) => <p key={i}>{addr}</p>)}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <FileText size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Terms &amp; Conditions</p>
            </div>
            <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-xs text-foreground whitespace-pre-wrap max-h-40 overflow-y-auto scrollbar-thin">
              {brochure.termsAndConditions}
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(brochure)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
            >
              <Edit2 size={13} /> Edit
            </button>
            <button
              onClick={() => onDuplicate(brochure)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
            >
              <Copy size={13} /> Duplicate
            </button>
            <button
              onClick={() => onDelete(brochure)}
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
