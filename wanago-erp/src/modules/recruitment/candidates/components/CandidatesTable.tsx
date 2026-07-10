"use client";

import { Edit2, Trash2, FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { SwipeableRow, type SwipeAction } from "@/components/shared/SwipeableRow";
import { formatDate, initials, cn } from "@/lib/utils/helpers";
import { RECRUITMENT_STAGE_LABELS } from "@/lib/constants";
import type { Candidate } from "@/modules/recruitment/candidates/types";

type Props = {
  candidates: Candidate[];
  loading:    boolean;
  canManage:  boolean;
  onView:     (candidate: Candidate) => void;
  onEdit:     (candidate: Candidate) => void;
  onDelete:   (candidate: Candidate) => void;
  onStage:    (candidate: Candidate, stage: string) => void;
};

export const STAGE_STYLES: Record<string, string> = {
  applied:      "text-slate-600 dark:text-slate-400",
  screening:    "text-blue-600 dark:text-blue-400",
  interview_r1: "text-purple-600 dark:text-purple-400",
  interview_r2: "text-purple-600 dark:text-purple-400",
  hr_round:     "text-amber-600 dark:text-amber-400",
  offer_sent:   "text-cyan-600 dark:text-cyan-400",
  joined:       "text-green-600 dark:text-green-400",
  rejected:     "text-red-600 dark:text-red-400",
};

export function CandidatesTable({ candidates, loading, canManage, onView, onEdit, onDelete, onStage }: Props) {
  if (loading) return <SkeletonTable rows={6} />;

  if (candidates.length === 0) {
    return (
      <EmptyState title="No candidates yet" description="Add your first candidate to get started" icon={<span className="text-2xl">🧑‍💻</span>} />
    );
  }

  return (
    <>
    <div className="hidden sm:block overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Candidate", "Applying For", "Source", "Resume", "Stage", "Date", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {candidates.map(c => (
              <tr key={c.id} onClick={() => onView(c)} className="cursor-pointer hover:bg-muted/20 transition-colors group">

                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(c.fullName)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{c.fullName}</p>
                      <p className="text-[11px] text-muted-foreground">{c.refNumber}</p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{c.jobOpeningTitle ?? "General"}</span>
                </td>

                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{c.source}</span>
                </td>

                <td className="px-4 py-3">
                  {c.resumeUrl ? (
                    <a href={c.resumeUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <FileText size={12} /> View
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>

                <td className="px-4 py-3">
                  {canManage ? (
                    <select
                      value={c.status}
                      onChange={(e) => onStage(c, e.target.value)}
                      className={cn("rounded-lg border-0 bg-transparent p-0 text-xs font-medium focus:ring-0 cursor-pointer", STAGE_STYLES[c.status])}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {Object.entries(RECRUITMENT_STAGE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={cn("text-xs font-medium", STAGE_STYLES[c.status])}>
                      {RECRUITMENT_STAGE_LABELS[c.status as keyof typeof RECRUITMENT_STAGE_LABELS] ?? c.status}
                    </span>
                  )}
                </td>

                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(c.createdAt)}</span>
                </td>

                <td className="px-4 py-3">
                  {canManage && (
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(c); }}
                        title="Edit"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(c); }}
                        title="Delete"
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

    <div className="sm:hidden space-y-2.5">
      {candidates.map((c) => {
        const actions: SwipeAction[] = canManage ? [
          { key: "edit", icon: <Edit2 size={16} />, label: "Edit", onClick: () => onEdit(c), className: "bg-blue-600" },
          { key: "delete", icon: <Trash2 size={16} />, label: "Delete", onClick: () => onDelete(c), className: "bg-red-600" },
        ] : [];
        return (
          <SwipeableRow key={c.id} actions={actions} onTap={() => onView(c)} className="rounded-xl border border-border">
            <div className="rounded-xl bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initials(c.fullName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{c.fullName}</p>
                    <p className="text-[11px] text-muted-foreground">{c.refNumber}</p>
                  </div>
                </div>
                <span className={cn("flex-shrink-0 text-xs font-medium", STAGE_STYLES[c.status])}>
                  {RECRUITMENT_STAGE_LABELS[c.status as keyof typeof RECRUITMENT_STAGE_LABELS] ?? c.status}
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                <span className="truncate text-xs text-muted-foreground">{c.jobOpeningTitle ?? "General"}</span>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(c.createdAt)}</span>
              </div>
            </div>
          </SwipeableRow>
        );
      })}
    </div>
    </>
  );
}
