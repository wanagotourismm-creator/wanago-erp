"use client";

import { CheckCircle2, XCircle, Database, Clock, RefreshCw, Loader2 } from "lucide-react";
import { useSystemHealth } from "@/modules/admin/health/hooks/useSystemHealth";
import { formatDate, cn } from "@/lib/utils/helpers";

export function SystemHealthPanel() {
  const { collections, lastActivityAt, loading, load } = useSystemHealth();

  const allOk = collections.length > 0 && collections.every(c => c.ok);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            loading ? "bg-muted" : allOk ? "bg-green-100 dark:bg-green-900/30" : "bg-destructive/10"
          )}>
            {loading ? <Loader2 size={18} className="animate-spin text-muted-foreground" /> :
              allOk ? <CheckCircle2 size={18} className="text-green-600" /> : <XCircle size={18} className="text-destructive" />}
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {loading ? "Checking connectivity..." : allOk ? "All systems operational" : "Some collections had errors"}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock size={11} />
              {lastActivityAt ? `Last activity: ${formatDate(lastActivityAt)}` : "No recent activity recorded"}
            </p>
          </div>
        </div>
        <button
          onClick={() => load()}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map(c => (
          <div key={c.key} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={13} className="text-muted-foreground" />
                <p className="text-xs font-medium text-foreground">{c.label}</p>
              </div>
              {c.ok ? <CheckCircle2 size={13} className="text-green-600" /> : <XCircle size={13} className="text-destructive" />}
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{c.ok ? c.count : "—"}</p>
            <p className="text-[11px] text-muted-foreground">{c.ok ? "records" : c.error ?? "Failed to query"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
