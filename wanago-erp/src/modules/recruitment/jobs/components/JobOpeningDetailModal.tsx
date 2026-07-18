"use client";

import { X, Edit2, Trash2, MapPin, Users, Briefcase } from "lucide-react";
import { STATUS_STYLES } from "@/modules/recruitment/jobs/components/JobOpeningsTable";
import { EMPLOYMENT_TYPE_LABELS } from "@/modules/hrms/employees/components/EmployeeBadges";
import { formatDate, cn } from "@/lib/utils/helpers";
import type { JobOpening } from "@/modules/recruitment/jobs/types";

type Props = {
  job:       JobOpening | null;
  canManage: boolean;
  onClose:   () => void;
  onEdit:    (job: JobOpening) => void;
  onDelete:  (job: JobOpening) => void;
  onStatus:  (job: JobOpening, status: JobOpening["jobStatus"]) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function JobOpeningDetailModal({ job, canManage, onClose, onEdit, onDelete, onStatus }: Props) {
  if (!job) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Briefcase size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{job.title}</h2>
              <p className="text-xs text-muted-foreground">{job.refNumber} · Posted {formatDate(job.postedDate)}</p>
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
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[job.jobStatus])}>
              {job.jobStatus === "on_hold" ? "On Hold" : job.jobStatus.charAt(0).toUpperCase() + job.jobStatus.slice(1)}
            </span>
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {EMPLOYMENT_TYPE_LABELS[job.employmentType]}
            </span>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <MapPin size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Position Details</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Department" value={job.department} />
              <Row label="Location" value={job.location} />
              <Row label="Office" value={job.officeName} />
              <Row label="Openings" value={<span className="inline-flex items-center gap-1.5"><Users size={12} />{job.openings}</span>} />
              <Row label="Posted" value={formatDate(job.postedDate)} />
              <Row label="Closing Date" value={job.closingDate ? formatDate(job.closingDate) : null} />
            </div>
          </div>

          {job.description && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Description</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {job.description}
              </p>
            </div>
          )}

          {job.requirements && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Requirements</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {job.requirements}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        {canManage && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(job)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
              >
                <Edit2 size={13} /> Edit
              </button>
              <button
                onClick={() => onDelete(job)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
            <select
              value={job.jobStatus}
              onChange={(e) => onStatus(job, e.target.value as JobOpening["jobStatus"])}
              className={cn("rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium cursor-pointer", STATUS_STYLES[job.jobStatus])}
            >
              <option value="open">Open</option>
              <option value="on_hold">On Hold</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        )}

      </div>
    </div>
  );
}
