"use client";

import { Edit2, Trash2, MapPin, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EMPLOYMENT_TYPE_LABELS } from "@/modules/hrms/employees/components/EmployeeBadges";
import { formatDate, cn } from "@/lib/utils/helpers";
import type { JobOpening } from "@/modules/recruitment/jobs/types";

type Props = {
  jobs:       JobOpening[];
  loading:    boolean;
  canManage:  boolean;
  onEdit:     (job: JobOpening) => void;
  onDelete:   (job: JobOpening) => void;
  onStatus:   (job: JobOpening, status: JobOpening["jobStatus"]) => void;
};

const STATUS_STYLES: Record<string, string> = {
  open:     "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed:   "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  on_hold:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export function JobOpeningsTable({ jobs, loading, canManage, onEdit, onDelete, onStatus }: Props) {
  if (loading) return <SkeletonTable rows={4} />;

  if (jobs.length === 0) {
    return (
      <EmptyState title="No job openings yet" description="Post your first job opening to start hiring" icon={<span className="text-2xl">💼</span>} />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {jobs.map(job => (
        <div key={job.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-foreground">{job.title}</p>
              <p className="text-[11px] text-muted-foreground">{job.refNumber} · {job.department}</p>
            </div>
            {canManage ? (
              <select
                value={job.jobStatus}
                onChange={(e) => onStatus(job, e.target.value as JobOpening["jobStatus"])}
                className={cn("rounded-full border-0 px-2 py-0.5 text-[11px] font-medium cursor-pointer", STATUS_STYLES[job.jobStatus])}
              >
                <option value="open">Open</option>
                <option value="on_hold">On Hold</option>
                <option value="closed">Closed</option>
              </select>
            ) : (
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_STYLES[job.jobStatus])}>
                {job.jobStatus === "on_hold" ? "On Hold" : job.jobStatus.charAt(0).toUpperCase() + job.jobStatus.slice(1)}
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><MapPin size={12} /> {job.location} · {EMPLOYMENT_TYPE_LABELS[job.employmentType]}</div>
            <div className="flex items-center gap-1.5"><Users size={12} /> {job.openings} opening{job.openings !== 1 ? "s" : ""}</div>
            <p>Posted {formatDate(job.postedDate)}{job.closingDate ? ` · Closes ${formatDate(job.closingDate)}` : ""}</p>
          </div>

          {canManage && (
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <button onClick={() => onEdit(job)} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                <Edit2 size={12} /> Edit
              </button>
              <button onClick={() => onDelete(job)} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
