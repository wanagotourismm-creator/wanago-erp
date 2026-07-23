"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Users, Sparkles, Target } from "lucide-react";
import { useSalesTeamPerformance } from "@/modules/sales-team/hooks/useSalesTeamPerformance";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { KudosModal } from "@/modules/sales-team/components/KudosModal";
import { formatCurrency, initials, cn } from "@/lib/utils/helpers";
import { RATING_LABELS, GOAL_STATUS_LABELS } from "@/lib/constants";
import type { DraftKudosInput } from "@/modules/sales-team/services/kudos-ai.service";
import type { SalesAgentPerformance } from "@/modules/sales-team/types";

// Same style/label maps as goals/components/GoalsPanel.tsx's objective
// status badge — duplicated locally rather than exported/shared since it's
// a small, page-local display concern in both places.
const OBJECTIVE_STATUS_STYLES: Record<string, string> = {
  on_track:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  at_risk:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  off_track: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  done:      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};
const OBJECTIVE_STATUS_LABELS: Record<string, string> = {
  on_track: "On Track", at_risk: "At Risk", off_track: "Off Track", done: "Done",
};

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Last 12 months (including current), newest first.
function buildMonthOptions() {
  const now = new Date();
  const options: { value: string; label: string; month: number; year: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: `${d.getFullYear()}-${d.getMonth()}`,
      label: `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`,
      month: d.getMonth(),
      year:  d.getFullYear(),
    });
  }
  return options;
}

export function SalesTeamPage() {
  const { performance, salesObjectives, loading, error, reload } = useSalesTeamPerformance();
  const monthOptions = useMemo(buildMonthOptions, []);
  const [selected, setSelected] = useState(monthOptions[0].value);
  const [kudosInput, setKudosInput] = useState<DraftKudosInput | null>(null);

  function handleDraftKudos(p: SalesAgentPerformance, monthLabel: string) {
    setKudosInput({
      agentName: p.agentName, monthLabel,
      revenue: p.revenue, bookingsConfirmed: 0, leadsWon: p.leadsWon, conversionRate: p.conversionRate,
    });
  }

  const filtered = useMemo(() => {
    const [year, month] = selected.split("-").map(Number);
    return performance.filter((p) => p.year === year && p.month === month);
  }, [performance, selected]);

  return (
    <div className="space-y-5">

      <PageHeader
        title="Sales Performance Hub"
        tourId="tour-salesteam-header"
        description="Leads, conversion, revenue, incentives, goals and reviews — unified per sales agent"
        actions={
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => reload()} data-tour-id="tour-salesteam-refresh">
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
      )}

      {salesObjectives.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Target size={14} className="text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Sales Team Objectives</p>
          </div>
          <div className="space-y-2.5">
            {salesObjectives.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{o.title}</span>
                    <span className={cn("flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", OBJECTIVE_STATUS_STYLES[o.objectiveStatus])}>
                      {OBJECTIVE_STATUS_LABELS[o.objectiveStatus]}
                    </span>
                  </div>
                  {o.ownerName && <p className="mt-0.5 text-xs text-muted-foreground">Owner: {o.ownerName}</p>}
                  <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${o.progressPercent}%` }} />
                  </div>
                </div>
                <span className="flex-shrink-0 text-sm font-semibold text-foreground">{o.progressPercent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <SkeletonTable rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="No sales activity for this month yet"
          description="Once leads are assigned or bookings are confirmed for a sales agent this month, their performance will show up here."
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3 text-right">Leads Assigned</th>
                  <th className="px-4 py-3 text-right">Leads Won</th>
                  <th className="px-4 py-3 text-right">Conversion</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Incentive</th>
                  <th className="px-4 py-3">Latest Goal</th>
                  <th className="px-4 py-3">Latest Review</th>
                  <th className="px-4 py-3 text-right">Recognition</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={`${p.agentId}-${p.year}-${p.month}`} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(p.agentName)}
                        </div>
                        <span className="font-medium text-foreground">{p.agentName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{p.leadsAssigned}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{p.leadsWon}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{p.conversionRate.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(p.revenue)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">{formatCurrency(p.incentiveAmount)}</td>
                    <td className="px-4 py-3">
                      {p.latestGoal ? (
                        <div className="max-w-[160px]">
                          <p className="truncate text-xs font-medium text-foreground">{p.latestGoal.title}</p>
                          <p className="text-[11px] text-muted-foreground">{p.latestGoal.progress}% · {GOAL_STATUS_LABELS[p.latestGoal.status as keyof typeof GOAL_STATUS_LABELS] ?? p.latestGoal.status}</p>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {p.latestReview ? (
                        <div>
                          <p className="text-xs font-medium text-foreground">{RATING_LABELS[p.latestReview.rating as keyof typeof RATING_LABELS] ?? p.latestReview.rating}</p>
                          <p className="text-[11px] text-muted-foreground">{p.latestReview.period}</p>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDraftKudos(p, monthOptions.find(o => o.value === selected)?.label ?? "")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Sparkles size={11} /> Draft Kudos
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <KudosModal open={kudosInput !== null} input={kudosInput} onClose={() => setKudosInput(null)} />

    </div>
  );
}
