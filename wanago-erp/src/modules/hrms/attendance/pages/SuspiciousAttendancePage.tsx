"use client";

import { RefreshCw, ShieldAlert, AlertTriangle, Flame, ShieldOff } from "lucide-react";
import { useSuspiciousAttendance } from "@/modules/hrms/attendance/hooks/useSuspiciousAttendance";
import { SuspiciousAttendanceTable } from "@/modules/hrms/attendance/components/SuspiciousAttendanceTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import type { SuspiciousAttendanceAttempt } from "@/modules/hrms/shared/types";

export function SuspiciousAttendancePage() {
  const {
    attempts, loading, error, stats, escalatedEmployeeIds, suspendedUserIds, reinstating,
    load, markReviewed, removeAttempt, reinstate,
  } = useSuspiciousAttendance();

  function handleDelete(a: SuspiciousAttendanceAttempt) {
    if (!confirm(`Delete this flagged attempt for ${a.employeeName}?`)) return;
    removeAttempt(a.id);
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Suspicious Attendance"
        description="Check-ins/outs blocked for a location-spoofing red flag, for HR review"
        actions={
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>Refresh</Button>
        }
      />

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <ShieldAlert size={16} className="text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">
            These are <strong className="text-foreground">heuristic flags</strong>, not proof — a browser can&apos;t
            confirm a GPS reading was faked the way a native mobile app can. An entry here means the
            employee&apos;s check-in/out was blocked because it looked physically implausible (an impossible
            travel speed since their last recorded position, GPS accuracy too precise for a real phone, or
            the exact same coordinates repeated across several days) — their reporting/functional manager was
            notified and their account was <strong className="text-foreground">automatically suspended</strong> pending
            review. Review each one and use <strong className="text-foreground">Reinstate</strong> to restore access
            once you and the manager are satisfied it's legitimate.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ShieldAlert size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total flagged</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.unreviewed}</p>
              <p className="text-xs text-muted-foreground">Needs review</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
              <Flame size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.escalated}</p>
              <p className="text-xs text-muted-foreground">Repeated pattern (3+ in 30 days)</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
              <ShieldOff size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.suspended}</p>
              <p className="text-xs text-muted-foreground">Accounts suspended</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
      )}

      <SuspiciousAttendanceTable
        attempts={attempts}
        loading={loading}
        escalatedEmployeeIds={escalatedEmployeeIds}
        suspendedUserIds={suspendedUserIds}
        reinstating={reinstating}
        onMarkReviewed={(a) => markReviewed(a.id)}
        onDelete={handleDelete}
        onReinstate={reinstate}
      />

    </div>
  );
}
