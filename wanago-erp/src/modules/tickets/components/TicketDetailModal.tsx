"use client";

import { X, Trash2, UserCheck, Ticket as TicketIcon, User } from "lucide-react";
import { TicketPriorityBadge, TicketStatusBadge, TICKET_STATUS_LABELS } from "@/modules/tickets/components/TicketBadges";
import { formatDate } from "@/lib/utils/helpers";
import type { Ticket, TicketStatus } from "@/modules/tickets/types";

type Props = {
  ticket:       Ticket | null;
  canDelete:    boolean;
  onClose:      () => void;
  onSetStatus:  (t: Ticket, status: TicketStatus) => void;
  onAssignToMe: (t: Ticket) => void;
  onDelete:     (t: Ticket) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function TicketDetailModal({ ticket, canDelete, onClose, onSetStatus, onAssignToMe, onDelete }: Props) {
  if (!ticket) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <TicketIcon size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{ticket.title}</h2>
              <p className="text-xs text-muted-foreground">{ticket.refNumber} · Reported {formatDate(ticket.createdAt)}</p>
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
            <TicketStatusBadge status={ticket.ticketStatus} />
            <TicketPriorityBadge priority={ticket.priority} />
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {ticket.category}
            </span>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <User size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Details</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Reported By" value={ticket.reportedByName} />
              <Row label="Assigned To" value={ticket.assignedToName} />
              <Row label="Category" value={ticket.category} />
              <Row label="Reported On" value={formatDate(ticket.createdAt)} />
            </div>
          </div>

          {ticket.description && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Description</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAssignToMe(ticket)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
            >
              <UserCheck size={13} /> Assign to me
            </button>
            {canDelete && (
              <button
                onClick={() => onDelete(ticket)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
          <select
            value={ticket.ticketStatus}
            onChange={(e) => onSetStatus(ticket, e.target.value as TicketStatus)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium cursor-pointer outline-none hover:border-primary/40"
          >
            {Object.entries(TICKET_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

      </div>
    </div>
  );
}
