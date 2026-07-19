"use client";

import { useEffect, useState } from "react";
import { Clock, Loader2, Save } from "lucide-react";
import { useAttendancePolicy } from "@/modules/attendancepolicy/hooks/useAttendancePolicy";
import type { AttendancePolicy } from "@/modules/attendancepolicy/services/attendance-policy.service";

const inputClass = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all hover:border-primary/40 focus:border-primary focus:ring-0";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export function AttendancePolicyForm() {
  const { policy, loading, saving, save } = useAttendancePolicy();
  const [draft, setDraft] = useState<AttendancePolicy>(policy);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setDraft(policy); }, [policy]);

  async function handleSave() {
    setError(null);
    if (draft.gracePeriodMinutes < 0 || draft.halfDayHours < 0 || draft.fullDayHours < 0 || draft.breakAllowanceMinutes < 0) {
      setError("Thresholds must be 0 or more.");
      return;
    }
    if (draft.halfDayHours >= draft.fullDayHours) {
      setError("Half-day hours must be less than full-day hours.");
      return;
    }
    const { error: saveError } = await save(draft);
    if (saveError) setError(saveError);
    else { setSaved(true); setTimeout(() => setSaved(false), 3000); }
  }

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={16} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">Office Working Hours</p>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Used to flag late arrivals and early departures on everyone&apos;s attendance record — it doesn&apos;t block a check-in/out itself.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Work Start Time">
            <input
              type="time" value={draft.workStartTime}
              onChange={(e) => setDraft((p) => ({ ...p, workStartTime: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="Work End Time">
            <input
              type="time" value={draft.workEndTime}
              onChange={(e) => setDraft((p) => ({ ...p, workEndTime: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="Grace Period (minutes)">
            <input
              type="number" min={0} value={draft.gracePeriodMinutes}
              onChange={(e) => setDraft((p) => ({ ...p, gracePeriodMinutes: Number(e.target.value) }))}
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold text-foreground mb-1">Hours Thresholds</p>
        <p className="text-xs text-muted-foreground mb-4">
          Hours worked below the half-day threshold flags the day as incomplete; at/above the full-day threshold counts as a full day.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Half Day (hours)">
            <input
              type="number" min={0} step={0.5} value={draft.halfDayHours}
              onChange={(e) => setDraft((p) => ({ ...p, halfDayHours: Number(e.target.value) }))}
              className={inputClass}
            />
          </Field>
          <Field label="Full Day (hours)">
            <input
              type="number" min={0} step={0.5} value={draft.fullDayHours}
              onChange={(e) => setDraft((p) => ({ ...p, fullDayHours: Number(e.target.value) }))}
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold text-foreground mb-1">Breaks</p>
        <p className="text-xs text-muted-foreground mb-4">
          Total minutes an employee can log via Start Break/End Break per day (e.g. Lunch 45m + Tea 20m = 65m) — shown as a running
          countdown on their ESS attendance card.
        </p>
        <div className="max-w-xs">
          <Field label="Break Allowance (minutes)">
            <input
              type="number" min={0} value={draft.breakAllowanceMinutes}
              onChange={(e) => setDraft((p) => ({ ...p, breakAllowanceMinutes: Number(e.target.value) }))}
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold text-foreground mb-1">Late Check-In</p>
        <p className="text-xs text-muted-foreground mb-4">
          When on, checking in past the grace period prompts the employee for a written reason, which is saved on their attendance
          record for HR to review.
        </p>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input type="checkbox" className="h-4 w-4 rounded border-input"
            checked={draft.lateReasonRequired}
            onChange={(e) => setDraft((p) => ({ ...p, lateReasonRequired: e.target.checked }))} />
          Require a written reason for late check-in
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-xs font-medium text-green-600">Saved</span>}
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Attendance Policy
        </button>
      </div>
    </div>
  );
}
