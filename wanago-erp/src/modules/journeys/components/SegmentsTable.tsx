"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Users } from "lucide-react";
import { useSegments } from "@/modules/journeys/hooks/useSegments";
import { SegmentForm } from "@/modules/journeys/components/SegmentForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import type { Segment } from "@/modules/journeys/types";

export function SegmentsTable() {
  const { segments, loading, addSegment, editSegment, removeSegment } = useSegments();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Segment | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(data: Parameters<typeof addSegment>[0]) {
    setSaving(true);
    try {
      const result = editing ? await editSegment(editing.id, data) : await addSegment(data);
      if (!result.error) { setFormOpen(false); setEditing(null); }
      return result;
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(segment: Segment) {
    if (!confirm(`Delete the segment "${segment.name}"?`)) return;
    await removeSegment(segment);
  }

  return (
    <div className="space-y-5">
      {!formOpen && (
        <button
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} /> New Segment
        </button>
      )}

      {formOpen && (
        <SegmentForm
          segment={editing}
          saving={saving}
          onSave={handleSave}
          onCancel={() => { setFormOpen(false); setEditing(null); }}
        />
      )}

      {loading ? <SkeletonTable rows={4} /> : segments.length === 0 ? (
        <EmptyState title="No segments yet" description="Create one to target a journey or filter" icon={<Users size={28} className="text-muted-foreground" />} />
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
          {segments.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                  {s.entityType === "both" ? "Leads + Customers" : s.entityType === "lead" ? "Leads" : "Customers"}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <button onClick={() => { setEditing(s); setFormOpen(true); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDelete(s)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
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
