"use client";

import { RotateCcw, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTrash } from "@/modules/admin/trash/hooks/useTrash";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/utils/helpers";
import type { TrashEntry } from "@/modules/admin/trash/types";

function guessLabel(entry: TrashEntry): string {
  const d = entry.data;
  return String(
    d.refNumber ?? d.fullName ?? d.name ?? d.customerName ?? d.employeeName ?? d.displayName ?? entry.originalId
  );
}

export function TrashPanel() {
  const { entries, loading, restore, purge } = useTrash();
  const [busy, setBusy] = useState<string | null>(null);

  async function handleRestore(entry: TrashEntry) {
    setBusy(entry.id);
    await restore(entry);
    setBusy(null);
  }

  async function handlePurge(entry: TrashEntry) {
    if (!confirm(`Permanently delete this ${entry.collectionName} record? This cannot be undone.`)) return;
    setBusy(entry.id);
    await purge(entry.id);
    setBusy(null);
  }

  if (loading) return <SkeletonTable rows={6} />;

  if (entries.length === 0) {
    return (
      <EmptyState
        title="Trash is empty"
        description="Deleted records from any module will show up here for 30 days before permanent cleanup"
        icon={<span className="text-2xl">🗑️</span>}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="divide-y divide-border">
        {entries.map(entry => (
          <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                  {entry.collectionName}
                </span>
                <p className="truncate text-sm font-medium text-foreground">{guessLabel(entry)}</p>
              </div>
              <p className="text-[11px] text-muted-foreground">Deleted {formatDate(entry.deletedAt as never)}</p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              {busy === entry.id ? (
                <Loader2 size={14} className="animate-spin text-muted-foreground" />
              ) : (
                <>
                  <button
                    onClick={() => handleRestore(entry)}
                    title="Restore"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    onClick={() => handlePurge(entry)}
                    title="Delete permanently"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
