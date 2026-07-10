"use client";

import { CheckCircle2, Trash2, MapPin, Flame } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { SwipeableRow, type SwipeAction } from "@/components/shared/SwipeableRow";
import { formatDateTime, cn } from "@/lib/utils/helpers";
import { SUSPICION_REASON_LABELS } from "@/lib/geo-fraud";
import type { SuspiciousAttendanceAttempt } from "@/modules/hrms/shared/types";

type Props = {
  attempts: SuspiciousAttendanceAttempt[];
  loading:  boolean;
  escalatedEmployeeIds: Set<string>;
  onMarkReviewed: (a: SuspiciousAttendanceAttempt) => void;
  onDelete:       (a: SuspiciousAttendanceAttempt) => void;
};

function EscalatedBadge() {
  return (
    <span title="3rd+ flagged attempt in the last 30 days" className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <Flame size={11} /> Repeated pattern
    </span>
  );
}

const ACTION_LABELS: Record<SuspiciousAttendanceAttempt["action"], string> = {
  check_in: "Check-in",
  check_out: "Check-out",
};

function ReasonsList({ reasons }: { reasons: string[] }) {
  return (
    <div className="space-y-0.5">
      {reasons.map((r) => (
        <p key={r} className="text-xs text-muted-foreground">
          &bull; {SUSPICION_REASON_LABELS[r as keyof typeof SUSPICION_REASON_LABELS] ?? r}
        </p>
      ))}
    </div>
  );
}

export function SuspiciousAttendanceTable({ attempts, loading, escalatedEmployeeIds, onMarkReviewed, onDelete }: Props) {
  if (loading) return <SkeletonTable rows={5} />;

  if (attempts.length === 0) {
    return (
      <EmptyState
        title="No flagged attempts"
        description="Blocked check-in/out attempts that look like location spoofing will show up here"
        icon={<span className="text-2xl">🛰️</span>}
      />
    );
  }

  return (
    <>
    <div className="hidden sm:block overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Employee", "Action", "Flagged For", "Location", "When", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {attempts.map((a) => (
              <tr key={a.id} className="hover:bg-muted/20 transition-colors group">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{a.employeeName}</p>
                  <p className="text-[11px] text-muted-foreground">{a.officeName}</p>
                  {escalatedEmployeeIds.has(a.employeeId) && <div className="mt-1"><EscalatedBadge /></div>}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{ACTION_LABELS[a.action] ?? a.action}</td>
                <td className="px-4 py-3"><ReasonsList reasons={a.reasons} /></td>
                <td className="px-4 py-3">
                  <a
                    href={`https://www.google.com/maps?q=${a.lat},${a.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <MapPin size={12} /> {a.lat.toFixed(5)}, {a.lng.toFixed(5)}
                  </a>
                  {a.accuracy != null && <p className="text-[11px] text-muted-foreground">&plusmn;{Math.round(a.accuracy)}m accuracy</p>}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(a.createdAt)}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    a.reviewed ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  )}>
                    {a.reviewed ? "Reviewed" : "Needs review"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {!a.reviewed && (
                      <button onClick={() => onMarkReviewed(a)} title="Mark reviewed"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                        <CheckCircle2 size={13} />
                      </button>
                    )}
                    <button onClick={() => onDelete(a)} title="Delete"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="sm:hidden space-y-2.5">
      {attempts.map((a) => {
        const actions: SwipeAction[] = [
          ...(!a.reviewed ? [{ key: "review", icon: <CheckCircle2 size={16} />, label: "Reviewed", onClick: () => onMarkReviewed(a), className: "bg-primary" }] : []),
          { key: "delete", icon: <Trash2 size={16} />, label: "Delete", onClick: () => onDelete(a), className: "bg-red-600" },
        ];
        return (
          <SwipeableRow key={a.id} actions={actions} className="rounded-xl border border-border">
            <div className="rounded-xl bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{a.employeeName}</p>
                  <p className="text-[11px] text-muted-foreground">{ACTION_LABELS[a.action]} &middot; {a.officeName}</p>
                  {escalatedEmployeeIds.has(a.employeeId) && <div className="mt-1"><EscalatedBadge /></div>}
                </div>
                <span className={cn(
                  "flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                  a.reviewed ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                )}>
                  {a.reviewed ? "Reviewed" : "Needs review"}
                </span>
              </div>
              <div className="mt-2 border-t border-border pt-2">
                <ReasonsList reasons={a.reasons} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <a href={`https://www.google.com/maps?q=${a.lat},${a.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary">
                  <MapPin size={11} /> View location
                </a>
                <span>{formatDateTime(a.createdAt)}</span>
              </div>
            </div>
          </SwipeableRow>
        );
      })}
    </div>
    </>
  );
}
