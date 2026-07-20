"use client";

import Link from "next/link";
import { AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils/helpers";
import type { CockpitAlert } from "@/modules/dashboard/types";

const SEVERITY_STYLES: Record<CockpitAlert["severity"], string> = {
  high:   "border-destructive/30 bg-destructive/5 text-destructive",
  medium: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400",
};

export function AlertsFeed({ alerts, loading }: { alerts: CockpitAlert[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Alerts</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">Overdue invoices &amp; negative-margin bookings</p>
        </div>
      </CardHeader>

      {loading ? (
        <div className="h-24 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 size={28} className="text-green-600/60 mb-2" />
          <p className="text-sm text-muted-foreground font-medium">No alerts — everything&apos;s on track.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Link
              key={alert.id}
              href={alert.href}
              className={cn(
                "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors hover:opacity-80",
                SEVERITY_STYLES[alert.severity]
              )}
            >
              {alert.severity === "high"
                ? <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                : <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />}
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{alert.title}</p>
                <p className="text-[11px] opacity-80 truncate">{alert.detail}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
