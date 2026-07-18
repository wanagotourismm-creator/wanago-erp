"use client";

import { useState } from "react";
import { X, Trash2, Upload, FileCheck, Loader2, GraduationCap, User } from "lucide-react";
import { STATUS_STYLES } from "@/modules/training/enrollments/components/EnrollmentsTable";
import { ENROLLMENT_STATUS_LABELS } from "@/lib/constants";
import { formatDate, initials, cn } from "@/lib/utils/helpers";
import type { TrainingEnrollment } from "@/modules/training/enrollments/types";

type Props = {
  enrollment: TrainingEnrollment | null;
  canManage:  boolean;
  onClose:    () => void;
  onDelete:   (enrollment: TrainingEnrollment) => void;
  onStatus:   (enrollment: TrainingEnrollment, status: TrainingEnrollment["status"]) => void;
  onUploadCertificate: (enrollment: TrainingEnrollment, file: File) => Promise<void>;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function EnrollmentDetailModal({ enrollment, canManage, onClose, onDelete, onStatus, onUploadCertificate }: Props) {
  const [uploading, setUploading] = useState(false);
  if (!enrollment) return null;

  async function handleUpload(file: File) {
    if (!enrollment) return;
    setUploading(true);
    try {
      await onUploadCertificate(enrollment, file);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials(enrollment.employeeName)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{enrollment.employeeName}</h2>
              <p className="text-xs text-muted-foreground">{enrollment.refNumber} · Enrolled {formatDate(enrollment.enrollmentDate)}</p>
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
            <span className={cn("inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[enrollment.status])}>
              {ENROLLMENT_STATUS_LABELS[enrollment.status]}
            </span>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <GraduationCap size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Program</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Program" value={enrollment.trainingProgramTitle} />
              <Row label="Office" value={enrollment.officeName} />
              <Row label="Enrolled" value={formatDate(enrollment.enrollmentDate)} />
              <Row label="Completed" value={enrollment.completionDate ? formatDate(enrollment.completionDate) : null} />
              <Row label="Score" value={enrollment.score ?? null} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <User size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Certificate</p>
            </div>
            <div className="rounded-xl border border-border px-3 py-2">
              {enrollment.certificateUrl ? (
                <a href={enrollment.certificateUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <FileCheck size={13} /> View Certificate
                </a>
              ) : canManage ? (
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  Upload Certificate
                  <input type="file" className="hidden" disabled={uploading}
                    onChange={ev => { const f = ev.target.files?.[0]; if (f) handleUpload(f); }} />
                </label>
              ) : (
                <span className="text-sm text-muted-foreground">No certificate uploaded</span>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        {canManage && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
            <button
              onClick={() => onDelete(enrollment)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={13} /> Remove
            </button>
            <select
              value={enrollment.status}
              onChange={(e) => onStatus(enrollment, e.target.value as TrainingEnrollment["status"])}
              className={cn("rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium cursor-pointer", STATUS_STYLES[enrollment.status])}
            >
              {Object.entries(ENROLLMENT_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        )}

      </div>
    </div>
  );
}
