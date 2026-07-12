"use client";

import { useState } from "react";
import { X, Mail, MapPin, Edit2, Trash2, FileText, CheckCircle2, User, PhoneCall, MessageCircle, Link2, Copy, Check, PackageCheck } from "lucide-react";
import { StageBadge, PriorityBadge, ReturningCustomerBadge } from "@/modules/leads/components/LeadBadges";
import { PhoneLink } from "@/components/shared/PhoneLink";
import { formatDate, formatDateTime, formatCurrency, initials, buildWhatsAppLink } from "@/lib/utils/helpers";
import { useCallLogs } from "@/modules/call-logs/hooks/useCallLogs";
import { CallLogForm } from "@/modules/call-logs/components/CallLogForm";
import { CallLogHistory } from "@/modules/call-logs/components/CallLogHistory";
import type { CallLogSchema } from "@/modules/call-logs/schemas";
import type { CallLogFormData, CallMethod, CallDirection } from "@/modules/call-logs/types";
import type { Lead } from "@/modules/leads/types";

type Props = {
  lead:      Lead | null;
  onClose:   () => void;
  onEdit:    (lead: Lead) => void;
  onDelete:  (lead: Lead) => void;
  onStage:   (lead: Lead, stage: string) => void;
  onGenerateLink: (lead: Lead) => Promise<{ token: string | null; error: string | null }>;
};

function appOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "https://wanago-erp.vercel.app";
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function LeadDetailModal({ lead, onClose, onEdit, onDelete, onStage, onGenerateLink }: Props) {
  const [callFormOpen, setCallFormOpen] = useState(false);
  const [callPrefill, setCallPrefill] = useState<{ method: CallMethod; direction: CallDirection } | null>(null);
  const [callLogRefreshKey, setCallLogRefreshKey] = useState(0);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const { addCallLog } = useCallLogs({ leadId: lead?.id });

  if (!lead) return null;

  const canQuote = !["quoted", "negotiation", "won", "lost"].includes(lead.stage);
  const canMarkWon = ["quoted", "negotiation"].includes(lead.stage);
  const bookingLink = lead.bookingLinkToken ? `${appOrigin()}/book/${lead.bookingLinkToken}` : null;

  async function handleGenerateLink() {
    setGeneratingLink(true);
    await onGenerateLink(lead!);
    setGeneratingLink(false);
  }

  function copyLink() {
    if (!bookingLink) return;
    navigator.clipboard.writeText(bookingLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    }).catch(() => {});
  }

  function openLogCallForm(prefill: { method: CallMethod; direction: CallDirection } | null) {
    setCallPrefill(prefill);
    setCallFormOpen(true);
  }

  function handlePhoneCallClick() {
    if (window.confirm("Log this call?")) {
      openLogCallForm({ method: "phone", direction: "outbound" });
    }
  }

  function handleWhatsAppClick() {
    if (window.confirm("Log this call?")) {
      openLogCallForm({ method: "whatsapp", direction: "outbound" });
    }
  }

  async function handleLogCall(data: CallLogSchema, recordingFile: File | null) {
    const fullData: CallLogFormData = {
      ...data,
      leadId: lead!.id,
      customerId: null,
      contactName: lead!.name,
      phone: lead!.phone,
      durationMinutes: data.durationMinutes ?? null,
      notes: data.notes ? data.notes : null,
      followUpNeeded: data.followUpNeeded ?? false,
      followUpDate: data.followUpDate ? data.followUpDate : null,
    };
    const { error } = await addCallLog(fullData, recordingFile);
    if (!error) {
      setCallFormOpen(false);
      setCallLogRefreshKey((k) => k + 1);
    }
  }

  return (
    <>
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
            {lead.matchedCustomerId && <ReturningCustomerBadge />}
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
              <Row
                label="Phone"
                value={
                  <span onClickCapture={handlePhoneCallClick}>
                    <PhoneLink phone={lead.phone} />
                  </span>
                }
              />
              {lead.alternatePhone && <Row label="Alternate Phone" value={lead.alternatePhone} />}
              {lead.email && <Row label="Email" value={<span className="inline-flex items-center gap-1.5"><Mail size={12} />{lead.email}</span>} />}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openLogCallForm(null)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
              >
                <PhoneCall size={12} /> Log a Call
              </button>
              {lead.phone && (
                <a
                  href={buildWhatsAppLink(lead.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleWhatsAppClick}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
                >
                  <MessageCircle size={12} /> Call via WhatsApp
                </a>
              )}
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
              <Row label="Budget" value={lead.budget ? formatCurrency(lead.budget) : null} />
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

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Link2 size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Customer Booking Link</p>
            </div>
            {bookingLink ? (
              <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5">
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{bookingLink}</span>
                <button
                  onClick={copyLink}
                  title="Copy link"
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  {linkCopied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                </button>
                <a
                  href={buildWhatsAppLink(lead.phone, `Hi ${lead.name.split(" ")[0]}, here's your link to pick your ${lead.destination} package: ${bookingLink}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Share via WhatsApp"
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <MessageCircle size={13} />
                </a>
              </div>
            ) : (
              <button
                onClick={handleGenerateLink}
                disabled={generatingLink}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted disabled:opacity-60 transition-colors"
              >
                <Link2 size={13} /> {generatingLink ? "Generating..." : "Generate Booking Link"}
              </button>
            )}
          </div>

          {lead.customerRequestedAt && (
            <div>
              <div className="mb-1 flex items-center gap-2">
                <PackageCheck size={13} className="text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Customer Request</p>
              </div>
              <div className="divide-y divide-border rounded-xl border border-border px-3">
                <Row label="Package Chosen" value={lead.customerSelectedPackageName} />
                <Row label="Preferred Date" value={lead.customerRequestedTravelDate ? formatDate(lead.customerRequestedTravelDate) : null} />
                <Row label="Travellers" value={lead.customerRequestedPax} />
                <Row label="Submitted" value={formatDateTime(lead.customerRequestedAt as never)} />
              </div>
              {lead.customerRequestNotes && (
                <p className="mt-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-xs text-foreground whitespace-pre-wrap">
                  {lead.customerRequestNotes}
                </p>
              )}
            </div>
          )}

          {lead.notes && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Notes</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {lead.notes}
              </p>
            </div>
          )}

          <CallLogHistory key={callLogRefreshKey} leadId={lead.id} />

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
                  if (confirm(`Mark "${lead.name}" as Won? This will create a customer record and a draft quotation, pre-filled and ready to review.`)) onStage(lead, "won");
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

    <CallLogForm
      open={callFormOpen}
      onClose={() => setCallFormOpen(false)}
      onSubmit={handleLogCall}
      contactName={lead.name}
      phone={lead.phone}
      leadId={lead.id}
      prefillMethod={callPrefill?.method}
      prefillDirection={callPrefill?.direction}
    />
    </>
  );
}
