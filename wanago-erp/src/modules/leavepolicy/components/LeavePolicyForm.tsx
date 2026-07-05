"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Loader2, Save } from "lucide-react";
import { useLeavePolicy } from "@/modules/leavepolicy/hooks/useLeavePolicy";
import {
  LEAVE_TYPE_ORDER, LEAVE_TYPE_LABELS, WEEKDAY_LABELS, type LeavePolicy,
} from "@/modules/leavepolicy/services/leave-policy.service";
import { cn } from "@/lib/utils/helpers";

export function LeavePolicyForm() {
  const { policy, loading, saving, save } = useLeavePolicy();
  const [draft, setDraft] = useState<LeavePolicy>(policy);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setDraft(policy); }, [policy]);

  function toggleType(key: keyof LeavePolicy["leaveTypes"], enabled: boolean) {
    setDraft((p) => ({ ...p, leaveTypes: { ...p.leaveTypes, [key]: { ...p.leaveTypes[key], enabled } } }));
  }

  function setDays(key: keyof LeavePolicy["leaveTypes"], annualDays: number) {
    setDraft((p) => ({ ...p, leaveTypes: { ...p.leaveTypes, [key]: { ...p.leaveTypes[key], annualDays } } }));
  }

  function toggleWeekday(day: number) {
    setDraft((p) => {
      const has = p.weeklyOffDays.includes(day);
      return { ...p, weeklyOffDays: has ? p.weeklyOffDays.filter((d) => d !== day) : [...p.weeklyOffDays, day].sort() };
    });
  }

  async function handleSave() {
    setSaved(false);
    const { error } = await save(draft);
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
  }

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays size={16} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">Leave Types & Entitlements</p>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Enable the leave types employees can apply for and set their annual day allowance. Disabled types stay hidden from Apply Leave
          but any past requests of that type are untouched — you can re-enable a type any time.
        </p>

        <div className="space-y-2">
          {LEAVE_TYPE_ORDER.map((key) => {
            const t = draft.leaveTypes[key];
            return (
              <div key={key} className={cn("flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors",
                t.enabled ? "border-primary/30 bg-primary/5" : "border-border")}>
                <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                  <input type="checkbox" className="h-4 w-4 rounded border-input flex-shrink-0" checked={t.enabled} onChange={(e) => toggleType(key, e.target.checked)} />
                  <span className={cn("text-sm font-medium", t.enabled ? "text-foreground" : "text-muted-foreground")}>{LEAVE_TYPE_LABELS[key]}</span>
                </label>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="number" min={0} disabled={!t.enabled} value={t.annualDays}
                    onChange={(e) => setDays(key, Number(e.target.value))}
                    className="w-20 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-right outline-none hover:border-primary/40 focus:border-primary disabled:opacity-50"
                  />
                  <span className="text-xs text-muted-foreground w-16">days/year</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold text-foreground mb-1">Weekly Off Days</p>
        <p className="text-xs text-muted-foreground mb-4">These days are automatically marked as week off on everyone&apos;s attendance calendar.</p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((label, i) => (
            <button key={label} type="button" onClick={() => toggleWeekday(i)}
              className={cn("rounded-xl px-3.5 py-2 text-sm font-medium transition-colors border",
                draft.weeklyOffDays.includes(i) ? "bg-primary text-white border-primary shadow-sm" : "border-border text-muted-foreground hover:border-primary/40")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-xs font-medium text-green-600">Saved</span>}
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Leave Policy
        </button>
      </div>
    </div>
  );
}
