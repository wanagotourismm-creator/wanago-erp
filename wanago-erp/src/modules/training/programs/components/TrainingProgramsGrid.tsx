"use client";

import { Edit2, Trash2, User, Calendar, FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { TRAINING_MODE_LABELS, TRAINING_STATUS_LABELS } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils/helpers";
import type { TrainingProgram } from "@/modules/training/programs/types";

type Props = {
  programs:   TrainingProgram[];
  loading:    boolean;
  canManage:  boolean;
  onEdit:     (program: TrainingProgram) => void;
  onDelete:   (program: TrainingProgram) => void;
  onStatus:   (program: TrainingProgram, status: TrainingProgram["status"]) => void;
};

const STATUS_STYLES: Record<string, string> = {
  upcoming:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ongoing:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export function TrainingProgramsGrid({ programs, loading, canManage, onEdit, onDelete, onStatus }: Props) {
  if (loading) return <SkeletonTable rows={4} />;

  if (programs.length === 0) {
    return <EmptyState title="No training programs yet" description="Create your first training program" icon={<span className="text-2xl">🎓</span>} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {programs.map(program => (
        <div key={program.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-foreground">{program.title}</p>
              <p className="text-[11px] text-muted-foreground">{program.refNumber} · {program.category}</p>
            </div>
            {canManage ? (
              <select
                value={program.status}
                onChange={(e) => onStatus(program, e.target.value as TrainingProgram["status"])}
                className={cn("rounded-full border-0 px-2 py-0.5 text-[11px] font-medium cursor-pointer", STATUS_STYLES[program.status])}
              >
                {Object.entries(TRAINING_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            ) : (
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_STYLES[program.status])}>
                {TRAINING_STATUS_LABELS[program.status]}
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><User size={12} /> {program.trainerName} · {TRAINING_MODE_LABELS[program.mode]}</div>
            <div className="flex items-center gap-1.5"><Calendar size={12} /> {formatDate(program.startDate)}{program.endDate ? ` – ${formatDate(program.endDate)}` : ""}</div>
            <div className="flex items-center gap-1.5"><FileText size={12} /> {program.materials.length} material{program.materials.length !== 1 ? "s" : ""}</div>
          </div>

          {canManage && (
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <button onClick={() => onEdit(program)} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                <Edit2 size={12} /> Edit
              </button>
              <button onClick={() => onDelete(program)} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
