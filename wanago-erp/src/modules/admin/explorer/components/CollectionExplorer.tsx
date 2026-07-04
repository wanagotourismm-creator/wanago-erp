"use client";

import { useState } from "react";
import { Search, Trash2, Loader2, ChevronDown, ChevronRight, Database } from "lucide-react";
import {
  EXPLORABLE_COLLECTIONS, fetchCollectionDocs, deleteExplorerDoc, type RawDoc,
} from "@/modules/admin/explorer/services/explorer.service";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/helpers";

export function CollectionExplorer() {
  const [selected, setSelected] = useState("");
  const [docs, setDocs] = useState<RawDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function handleLoad() {
    if (!selected) return;
    setLoading(true);
    setLoaded(true);
    try {
      const data = await fetchCollectionDocs(selected);
      setDocs(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(`Delete this document from "${selected}"? It'll be moved to Trash.`)) return;
    setBusy(id);
    try {
      await deleteExplorerDoc(selected, id);
      setDocs(prev => prev.filter(d => d.id !== id));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
        Raw database viewer — shows documents exactly as stored in Firestore. Deleting here moves the document to Trash, same as anywhere else.
      </div>

      <div className="flex items-center gap-3">
        <select
          className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none hover:border-primary/40 focus:border-primary"
          value={selected}
          onChange={e => { setSelected(e.target.value); setLoaded(false); setDocs([]); }}
        >
          <option value="">Select a collection...</option>
          {EXPLORABLE_COLLECTIONS.map(c => (
            <option key={c.key} value={c.key}>{c.label} ({c.key})</option>
          ))}
        </select>
        <button
          onClick={handleLoad}
          disabled={!selected || loading}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Load (up to 100)
        </button>
      </div>

      {loaded && !loading && docs.length === 0 && (
        <EmptyState title="No documents found" description={`"${selected}" is empty`} icon={<Database size={22} className="text-muted-foreground" />} />
      )}

      {docs.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="divide-y divide-border">
            {docs.map(d => (
              <div key={d.id}>
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <button
                    onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    {expanded === d.id ? <ChevronDown size={13} className="flex-shrink-0 text-muted-foreground" /> : <ChevronRight size={13} className="flex-shrink-0 text-muted-foreground" />}
                    <span className="truncate font-mono text-xs text-foreground">{d.id}</span>
                  </button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    disabled={busy === d.id}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    {busy === d.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
                {expanded === d.id && (
                  <pre className={cn(
                    "overflow-x-auto bg-muted/30 px-4 py-3 text-[11px] font-mono text-muted-foreground",
                  )}>
                    {JSON.stringify(d.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
