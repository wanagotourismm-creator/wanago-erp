"use client";

import { useState } from "react";
import { Plus, Trash2, CalendarOff, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import { useResources } from "@/modules/resources/hooks/useResources";
import { useResourceBlackouts } from "@/modules/resources/hooks/useResourceBlackouts";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import type { ResourceBlackout } from "@/modules/resources/types";

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all",
  "hover:border-primary/40 focus:border-primary [&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export function BlackoutsTable() {
  const { resources } = useResources();
  const { blackouts, loading, addBlackout, removeBlackout } = useResourceBlackouts();
  const [formOpen, setFormOpen] = useState(false);
  const [resourceId, setResourceId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeResources = resources.filter((r) => r.isActive);

  function cancel() {
    setFormOpen(false);
    setResourceId(""); setStartDate(""); setEndDate(""); setReason("");
    setError(null);
  }

  async function handleSave() {
    const resource = activeResources.find((r) => r.id === resourceId);
    if (!resource) { setError("Select a resource."); return; }
    if (!startDate || !endDate) { setError("Start and end dates are required."); return; }
    if (endDate < startDate) { setError("End date can't be before the start date."); return; }
    if (!reason.trim()) { setError("A reason is required."); return; }

    setSaving(true);
    setError(null);
    try {
      const result = await addBlackout({ resourceId: resource.id, resourceName: resource.name, startDate, endDate, reason });
      if (result.error) { setError(result.error); return; }
      cancel();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(b: ResourceBlackout) {
    if (!confirm(`Remove the blackout for "${b.resourceName}"?`)) return;
    await removeBlackout(b);
  }

  return (
    <div className="space-y-5">
      {!formOpen && (
        <button onClick={() => setFormOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
          <Plus size={14} /> Add Blackout
        </button>
      )}

      {formOpen && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Add Blackout</p>
          {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Resource">
                <select className={inputClass} value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
                  <option value="">Select resource</option>
                  {activeResources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Start Date">
              <input type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="End Date">
              <input type="date" className={inputClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Reason">
                <input className={inputClass} placeholder="e.g. Scheduled maintenance" value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={cancel} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <X size={14} /> Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Add
            </button>
          </div>
        </div>
      )}

      {loading ? <SkeletonTable rows={4} /> : blackouts.length === 0 ? (
        <EmptyState title="No blackouts" description="Block out a resource for maintenance or leave" icon={<CalendarOff size={28} className="text-muted-foreground" />} />
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
          {blackouts.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{b.resourceName}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{b.startDate} → {b.endDate} · {b.reason}</p>
              </div>
              <button onClick={() => handleDelete(b)} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
