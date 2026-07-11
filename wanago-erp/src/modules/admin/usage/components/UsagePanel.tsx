"use client";

import { RefreshCw, Loader2, AlertTriangle, CheckCircle2, Database } from "lucide-react";
import { useUsage } from "@/modules/admin/usage/hooks/useUsage";
import { formatDate, cn } from "@/lib/utils/helpers";

const WARNING_STYLES = {
  ok:       { bar: "bg-green-500",  text: "text-green-600",  chip: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  warning:  { bar: "bg-amber-500",  text: "text-amber-600",  chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  critical: { bar: "bg-red-500",    text: "text-red-600",    chip: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
} as const;

function QuotaBar({ label, count, limit, pct }: { label: string; count: number; limit: number; pct: number }) {
  const level = pct >= 100 ? "critical" : pct >= 80 ? "warning" : "ok";
  const styles = WARNING_STYLES[level];
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-medium", styles.text)}>{count.toLocaleString()} / {limit.toLocaleString()} ({pct}%)</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", styles.bar)} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function WarningChip({ level, okLabel }: { level: "ok" | "warning" | "critical"; okLabel: string }) {
  const label = level === "critical" ? "Near/over free limit" : level === "warning" ? "Approaching limit" : okLabel;
  const Icon = level === "ok" ? CheckCircle2 : AlertTriangle;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium", WARNING_STYLES[level].chip)}>
      <Icon size={11} /> {label}
    </span>
  );
}

export function UsagePanel() {
  const { data, loading, error, load } = useUsage();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Usage &amp; Quotas</p>
          <p className="text-xs text-muted-foreground">
            Firebase Firestore&apos;s daily free-tier quotas and Supabase&apos;s mirrored-data footprint — for real billing alerts, see your Google Cloud Budget Alert (set up separately, this only tracks usage volume).
          </p>
        </div>
        <button
          onClick={() => load()}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center rounded-2xl border border-border bg-card">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">{error}</div>
      ) : data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* Firebase card */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={14} className="text-primary" />
                <p className="text-sm font-semibold text-foreground">Firebase (today)</p>
              </div>
              {data.firebase.available && <WarningChip level={data.firebase.warningLevel} okLabel="Within free tier" />}
            </div>

            {!data.firebase.available ? (
              <p className="text-xs text-muted-foreground">{data.firebase.error ?? "Usage data unavailable."}</p>
            ) : (
              <div className="space-y-3">
                <QuotaBar label="Document reads"   {...data.firebase.reads} />
                <QuotaBar label="Document writes"  {...data.firebase.writes} />
                <QuotaBar label="Document deletes" {...data.firebase.deletes} />
                <p className="text-[10px] text-muted-foreground">Against Firebase Spark&apos;s free daily quota. Resets every midnight.</p>
              </div>
            )}
          </div>

          {/* Supabase card */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={14} className="text-primary" />
                <p className="text-sm font-semibold text-foreground">Supabase (reporting mirror)</p>
              </div>
              {data.supabase.available && <WarningChip level={data.supabase.warningLevel} okLabel="Well within free tier" />}
            </div>

            {!data.supabase.available ? (
              <p className="text-xs text-muted-foreground">No sync has run yet.</p>
            ) : (
              <div className="space-y-3">
                <QuotaBar label="Estimated storage" count={data.supabase.approxMB} limit={data.supabase.limitMB} pct={data.supabase.pct} />
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Customers mirrored</p>
                    <p className="font-semibold text-foreground">{data.supabase.customersSynced.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Bookings mirrored</p>
                    <p className="font-semibold text-foreground">{data.supabase.bookingsSynced.toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {data.supabase.lastSyncedAt ? `Last synced ${formatDate(data.supabase.lastSyncedAt)}` : "Not yet synced"} · storage is an estimate (row count × avg. row size), not exact bytes
                </p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
