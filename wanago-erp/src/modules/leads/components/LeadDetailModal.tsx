"use client";

import { X, Mail, MapPin, Edit2, Trash2, FileText, CheckCircle2, User } from "lucide-react";
import { StageBadge, PriorityBadge } from "@/modules/leads/components/LeadBadges";
import { PhoneLink } from "@/components/shared/PhoneLink";
import { formatDate, formatDateTime, initials } from "@/lib/utils/helpers";
import type { Lead } from "@/modules/leads/types";

type Props = {
  lead:      Lead | null;
  onClose:   () => void;
  onEdit:    (lead: Lead) => void;
  onDelete:  (lead: Lead) => void;
  onStage:   (lead: Lead, stage: string) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function LeadDetailModal({ lead, onClose, onEdit, onDelete, onStage }: Props) {
  if (!lead) return null;

  const canQuote = !["quoted", "negotiation", "won", "lost"].includes(lead.stage);
  const canMarkWon = ["quoted", "negotiation"].includes(lead.stage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {initials(lead.name)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{lead.name}</h2>
              <p className="text-xs text-muted-foreground">{lead.refNumber} · Added {formatDate(lead.createdAt)}</p>
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
            <StageBadge stage={lead.stage} />
            <PriorityBadge priority={lead.priority} />
            {lead.source && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {lead.source}
              </span>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <User size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Contact</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Phone" value={<PhoneLink phone={lead.phone} />} />
              {lead.alternatePhone && <Row label="Alternate Phone" value={lead.alternatePhone} />}
              {lead.email && <Row label="Email" value={<span className="inline-flex items-center gap-1.5"><Mail size={12} />{lead.email}</span>} />}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <MapPin size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Trip Details</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Destination" value={lead.destination} />
              <Row label="Trip Type" value={lead.tripType} />
              <Row label="No. of Pax" value={lead.pax} />
              <Row label="Travel Date" value={lead.travelDate ? formatDate(lead.travelDate) : null} />
              <Row label="Return Date" value={lead.returnDate ? formatDate(lead.returnDate) : null} />
              <Row label="Duration" value={lead.duration ? `${lead.duration} nights` : null} />
              <Row label="Budget" value={lead.budget ? `₹${lead.budget.toLocaleString()}` : null} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <User size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Pipeline</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Agent" value={lead.agentName} />
              <Row label="Office" value={lead.officeName} />
              <Row label="Last Contacted" value={lead.lastContactedAt ? formatDateTime(lead.lastContactedAt as never) : null} />
            </div>
          </div>

          {lead.notes && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Notes</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {lead.notes}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(lead)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
            >
              <Edit2 size={13} /> Edit
            </button>
            <button
              onClick={() => onDelete(lead)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
          <div className="flex items-center gap-2">
            {canQuote && (
              <button
                onClick={() => onStage(lead, "quoted")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/70 transition-colors"
              >
                <FileText size={13} /> Send Quotation
              </button>
            )}
            {canMarkWon && (
              <button
                onClick={() => {
                  if (confirm(`Mark "${lead.name}" as Won? This will create a customer record.`)) onStage(lead, "won");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm"
              >
                <CheckCircle2 size={13} /> Mark Won
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
