"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Users, Sparkles } from "lucide-react";
import { useSalesTeamPerformance } from "@/modules/sales-team/hooks/useSalesTeamPerformance";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { KudosModal } from "@/modules/sales-team/components/KudosModal";
import { formatCurrency, initials } from "@/lib/utils/helpers";
import type { DraftKudosInput } from "@/modules/sales-team/services/kudos-ai.service";
import type { SalesAgentPerformance } from "@/modules/sales-team/types";

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
  const { performance, loading, error, reload } = useSalesTeamPerformance();
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
        title="Sales Team Performance"
        tourId="tour-salesteam-header"
        description="Leads, conversion, revenue and incentive estimate per sales agent"
        actions={
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => reload()} data-tour-id="tour-salesteam-refresh">
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
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
