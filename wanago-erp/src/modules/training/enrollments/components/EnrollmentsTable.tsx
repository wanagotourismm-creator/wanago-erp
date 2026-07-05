"use client";

import { useState } from "react";
import { Trash2, Upload, FileCheck, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { ENROLLMENT_STATUS_LABELS } from "@/lib/constants";
import { formatDate, initials, cn } from "@/lib/utils/helpers";
import type { TrainingEnrollment } from "@/modules/training/enrollments/types";

type Props = {
  enrollments: TrainingEnrollment[];
  loading:     boolean;
  canManage:   boolean;
  onView:      (enrollment: TrainingEnrollment) => void;
  onDelete:    (enrollment: TrainingEnrollment) => void;
  onStatus:    (enrollment: TrainingEnrollment, status: TrainingEnrollment["status"]) => void;
  onUploadCertificate: (enrollment: TrainingEnrollment, file: File) => Promise<void>;
};

export const STATUS_STYLES: Record<string, string> = {
  enrolled:    "text-slate-600 dark:text-slate-400",
  in_progress: "text-blue-600 dark:text-blue-400",
  completed:   "text-green-600 dark:text-green-400",
  dropped:     "text-red-600 dark:text-red-400",
};

export function EnrollmentsTable({ enrollments, loading, canManage, onView, onDelete, onStatus, onUploadCertificate }: Props) {
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  if (loading) return <SkeletonTable rows={5} />;

  if (enrollments.length === 0) {
    return <EmptyState title="No enrollments yet" description="Enroll an employee to start tracking training" icon={<span className="text-2xl">📝</span>} />;
  }

  async function handleUpload(enrollment: TrainingEnrollment, file: File) {
    setUploadingFor(enrollment.id);
    try {
      await onUploadCertificate(enrollment, file);
    } finally {
      setUploadingFor(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Employee", "Program", "Enrolled", "Status", "Completed", "Certificate", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {enrollments.map(e => (
              <tr key={e.id} onClick={() => onView(e)} className="cursor-pointer hover:bg-muted/20 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(e.employeeName)}
                    </div>
                    <p className="font-medium text-foreground">{e.employeeName}</p>
                  </div>
                </td>
                <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{e.trainingProgramTitle}</span></td>
                <td className="px-4 py-3"><span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(e.enrollmentDate)}</span></td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <select
                      value={e.status}
                      onChange={(ev) => onStatus(e, ev.target.value as TrainingEnrollment["status"])}
                      onClick={(ev) => ev.stopPropagation()}
                      className={cn("rounded-lg border-0 bg-transparent p-0 text-xs font-medium focus:ring-0 cursor-pointer", STATUS_STYLES[e.status])}
                    >
                      {Object.entries(ENROLLMENT_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={cn("text-xs font-medium", STATUS_STYLES[e.status])}>{ENROLLMENT_STATUS_LABELS[e.status]}</span>
                  )}
                </td>
                <td className="px-4 py-3"><span className="text-xs text-muted-foreground whitespace-nowrap">{e.completionDate ? formatDate(e.completionDate) : "—"}</span></td>
                <td className="px-4 py-3">
                  {e.certificateUrl ? (
                    <a href={e.certificateUrl} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()} className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <FileCheck size={12} /> View
                    </a>
                  ) : canManage ? (
                    <label onClick={(ev) => ev.stopPropagation()} className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {uploadingFor === e.id ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      Upload
                      <input type="file" className="hidden" disabled={uploadingFor === e.id}
                        onChange={ev => { const f = ev.target.files?.[0]; if (f) handleUpload(e, f); }} />
                    </label>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {canManage && (
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(ev) => { ev.stopPropagation(); onDelete(e); }}
                        title="Remove"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
