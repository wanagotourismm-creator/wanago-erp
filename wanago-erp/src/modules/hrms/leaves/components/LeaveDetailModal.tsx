"use client";

import { X, Edit2, Trash2, Check, XCircle, CalendarDays, User } from "lucide-react";
import { LeaveStatusBadge, LeaveTypeBadge } from "@/modules/hrms/leaves/components/LeaveBadges";
import { formatDate, formatDateTime, initials } from "@/lib/utils/helpers";
import type { LeaveRequest } from "@/modules/hrms/shared/types";

type Props = {
  leave:     LeaveRequest | null;
  canDecide: boolean;
  onClose:   () => void;
  onEdit:    (l: LeaveRequest) => void;
  onDelete:  (l: LeaveRequest) => void;
  onApprove: (l: LeaveRequest) => void;
  onReject:  (l: LeaveRequest) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function LeaveDetailModal({ leave, canDecide, onClose, onEdit, onDelete, onApprove, onReject }: Props) {
  if (!leave) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {initials(leave.employeeName)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{leave.employeeName}</h2>
              <p className="text-xs text-muted-foreground">{formatDate(leave.fromDate)} – {formatDate(leave.toDate)}</p>
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
            <LeaveStatusBadge status={leave.status} />
            <LeaveTypeBadge type={leave.leaveType} />
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <CalendarDays size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Leave Details</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="From" value={formatDate(leave.fromDate)} />
              <Row label="To" value={formatDate(leave.toDate)} />
              <Row label="Days" value={leave.days} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <User size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Decision</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              {leave.approvedBy && <Row label="Approved By" value={leave.approvedBy} />}
              {leave.approvedAt && <Row label="Approved At" value={formatDateTime(leave.approvedAt as never)} />}
              {leave.rejectedBy && <Row label="Rejected By" value={leave.rejectedBy} />}
              {leave.comments && <Row label="Comments" value={leave.comments} />}
              {!leave.approvedBy && !leave.rejectedBy && !leave.comments && <Row label="Status" value={<LeaveStatusBadge status={leave.status} />} />}
            </div>
          </div>

          {leave.reason && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Reason</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {leave.reason}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(leave)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
            >
              <Edit2 size={13} /> Edit
            </button>
            <button
              onClick={() => onDelete(leave)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
          {canDecide && leave.status === "pending" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onReject(leave)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <XCircle size={13} /> Reject
              </button>
              <button
                onClick={() => onApprove(leave)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Check size={13} /> Approve
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
