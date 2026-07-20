"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Workflow } from "lucide-react";
import { useJourneys } from "@/modules/journeys/hooks/useJourneys";
import { JourneyForm } from "@/modules/journeys/components/JourneyForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/helpers";
import type { Journey } from "@/modules/journeys/types";

const TRIGGER_LABELS: Record<string, string> = {
  quote_sent: "Quote sent",
  quote_unaccepted: "Quote unaccepted",
  trip_completed: "Trip completed",
};

export function JourneysTable() {
  const { journeys, loading, addJourney, editJourney, removeJourney } = useJourneys();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Journey | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(data: Parameters<typeof addJourney>[0]) {
    setSaving(true);
    try {
      const result = editing ? await editJourney(editing.id, data) : await addJourney(data);
      if (!result.error) { setFormOpen(false); setEditing(null); }
      return result;
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(journey: Journey) {
    if (!confirm(`Delete the journey "${journey.name}"? In-progress runs will stop advancing.`)) return;
    await removeJourney(journey);
  }

  async function toggleActive(journey: Journey) {
    await editJourney(journey.id, { isActive: !journey.isActive });
  }

  return (
    <div className="space-y-5">
      {!formOpen && (
        <button
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} /> New Journey
        </button>
      )}

      {formOpen && (
        <JourneyForm
          journey={editing}
          saving={saving}
          onSave={handleSave}
          onCancel={() => { setFormOpen(false); setEditing(null); }}
        />
      )}

      {loading ? <SkeletonTable rows={4} /> : journeys.length === 0 ? (
        <EmptyState title="No journeys yet" description="Create one to start automating follow-ups" icon={<Workflow size={28} className="text-muted-foreground" />} />
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
          {journeys.map((j) => (
            <div key={j.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{j.name}</p>
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                    j.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"
                  )}>
                    {j.isActive ? "active" : "paused"}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                  {TRIGGER_LABELS[j.trigger.type]} · {j.steps.length} step{j.steps.length !== 1 ? "s" : ""} · {j.enteredCount} entered
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <button
                  onClick={() => toggleActive(j)}
                  className="rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  {j.isActive ? "Pause" : "Activate"}
                </button>
                <button onClick={() => { setEditing(j); setFormOpen(true); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDelete(j)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
