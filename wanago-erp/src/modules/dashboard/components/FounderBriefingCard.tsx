"use client";

import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/helpers";
import { useLatestFounderBriefing } from "@/modules/digests/hooks/useLatestFounderBriefing";

// Reads the precomputed founder-briefing digest (Mondays, 5am UTC — see
// vercel.json + founder-briefing.service.ts). Only shown on the company-wide
// dashboard (Admin/Super Admin), since it's an executive summary across the
// whole company, not something every role should see.
export function FounderBriefingCard() {
  const { briefing, loading } = useLatestFounderBriefing();

  if (loading) {
    return (
      <Card>
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Card>
    );
  }

  if (!briefing) {
    return (
      <Card>
        <CardTitle>Founder Briefing</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">No briefing yet — generates every Monday.</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={16} className="text-primary" />
        <CardTitle>Founder Briefing</CardTitle>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Week of {briefing.weekOf}</p>

      <p className="mb-4 text-sm text-foreground leading-relaxed">{briefing.narrative}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Revenue</p>
          <p className="text-sm font-semibold text-foreground">{formatCurrency(briefing.totalRevenue)}</p>
          {briefing.revenueChangePct !== null && (
            <p className={`mt-0.5 flex items-center gap-1 text-[11px] font-medium ${briefing.revenueChangePct >= 0 ? "text-green-600" : "text-destructive"}`}>
              {briefing.revenueChangePct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {Math.abs(briefing.revenueChangePct)}% vs last week
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Bookings</p>
          <p className="text-sm font-semibold text-foreground">{briefing.totalBookings}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Top Performer</p>
          <p className="text-sm font-semibold text-foreground truncate">{briefing.topPerformerName ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Going Cold</p>
          <p className="text-sm font-semibold text-foreground">{briefing.goingColdCount} customers</p>
        </div>
      </div>
    </Card>
  );
}
