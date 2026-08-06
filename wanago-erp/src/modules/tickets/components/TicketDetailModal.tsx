"use client";

import { X, Trash2, UserCheck, Ticket as TicketIcon, User, Timer, Bot, GitPullRequest, Check, XCircle, Film, Image as ImageIcon, Paperclip } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { TicketPriorityBadge, TicketStatusBadge, TicketSlaBadge, TICKET_STATUS_LABELS } from "@/modules/tickets/components/TicketBadges";
import { CodeDiffView } from "@/modules/tickets/components/CodeDiffView";
import { getTicketSlaStatus } from "@/modules/tickets/services/ticket-sla.service";
import { formatDate } from "@/lib/utils/helpers";
import type { TicketSlaPolicy } from "@/modules/tickets/services/ticket-sla-policy.service";
import type { Ticket, TicketStatus } from "@/modules/tickets/types";

type Props = {
  ticket:          Ticket | null;
  canDelete:       boolean;
  canManageAiFix:  boolean;
  slaPolicy:       TicketSlaPolicy;
  aiReviewBusy:    boolean;
  onClose:         () => void;
  onSetStatus:     (t: Ticket, status: TicketStatus) => void;
  onAssignToMe:    (t: Ticket) => void;
  onDelete:        (t: Ticket) => void;
  onApproveAiFix:  (t: Ticket) => void;
  onRejectAiFix:   (t: Ticket) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function TicketDetailModal({
  ticket, canDelete, canManageAiFix, slaPolicy, aiReviewBusy,
  onClose, onSetStatus, onAssignToMe, onDelete, onApproveAiFix, onRejectAiFix,
}: Props) {
  if (!ticket) return null;
  const sla = getTicketSlaStatus(ticket, slaPolicy);

  return (
    <Modal onClose={onClose} size="md">

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

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Timer size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">SLA</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="First Response" value={<TicketSlaBadge clock={sla.response} />} />
              <Row label="Resolution" value={<TicketSlaBadge clock={sla.resolution} />} />
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

          {ticket.attachments && ticket.attachments.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <Paperclip size={13} className="text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Attachments</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {ticket.attachments.filter((a) => a.type !== "video-frame").map((a, i) => (
                  <a
                    key={`${a.url}-${i}`} href={a.url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 transition-colors"
                  >
                    {a.type === "video" ? <Film size={12} className="text-primary" /> : <ImageIcon size={12} className="text-primary" />}
                    <span className="max-w-[10rem] truncate">{a.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {ticket.resolutionNotes && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Resolution</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {ticket.resolutionNotes}
              </p>
            </div>
          )}

          {ticket.aiDiagnosis && (
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <Bot size={13} className="text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-primary">AI Diagnosis</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 space-y-3">
                <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.aiDiagnosis}</p>

                {ticket.aiFixReviewStatus === "pending_review" && ticket.aiProposedFix && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-foreground">
                      Proposed change to {ticket.aiProposedFix.files.length} file{ticket.aiProposedFix.files.length === 1 ? "" : "s"} — nothing has been pushed to GitHub yet.
                    </p>
                    {ticket.aiProposedFix.files.map((f) => (
                      <div key={f.targetFile} className="space-y-1.5">
                        <p className="text-xs font-medium text-foreground">
                          <code className="rounded bg-muted px-1 py-0.5">{f.targetFile}</code>
                          {f.isNewFile && <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">New file</span>}
                        </p>
                        <CodeDiffView oldContent={f.oldFileContent} newContent={f.newFileContent} />
                      </div>
                    ))}
                    {canManageAiFix ? (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => onApproveAiFix(ticket)}
                          disabled={aiReviewBusy}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                        >
                          <Check size={12} /> Approve — open draft PR
                        </button>
                        <button
                          onClick={() => onRejectAiFix(ticket)}
                          disabled={aiReviewBusy}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60 transition-colors"
                        >
                          <XCircle size={12} /> Reject
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs font-medium text-muted-foreground">Waiting on an admin to review and approve this before anything is pushed to GitHub.</p>
                    )}
                  </div>
                )}

                {ticket.aiFixReviewStatus === "approved" && ticket.aiPrUrl && (
                  <a
                    href={ticket.aiPrUrl} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                  >
                    <GitPullRequest size={12} /> View draft PR — still needs a human to merge on GitHub
                  </a>
                )}

                {ticket.aiFixReviewStatus === "rejected" && (
                  <p className="text-xs font-medium text-muted-foreground">Rejected by an admin — nothing was pushed to GitHub.</p>
                )}

                {!ticket.aiFixReviewStatus && (
                  <p className="text-xs font-medium text-muted-foreground">Needs manual triage — the AI wasn&apos;t confident enough to propose a fix.</p>
                )}
              </div>
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

    </Modal>
  );
}
