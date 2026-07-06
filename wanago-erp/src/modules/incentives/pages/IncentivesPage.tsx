"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, TrendingUp } from "lucide-react";
import { useIncentives } from "@/modules/incentives/hooks/useIncentives";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatCurrency, initials } from "@/lib/utils/helpers";

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

export function IncentivesPage() {
  const { summaries, loading, reload } = useIncentives();
  const monthOptions = useMemo(buildMonthOptions, []);
  const [selected, setSelected] = useState("all");

  const filtered = useMemo(() => {
    if (selected === "all") return summaries;
    const [year, month] = selected.split("-").map(Number);
    return summaries.filter((s) => s.year === year && s.month === month);
  }, [summaries, selected]);

  return (
    <div className="space-y-5">

      <PageHeader
        title="Sales Incentives"
        description="Profit-based incentive estimate — rate is a placeholder until the final formula is confirmed"
        actions={
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => reload()}>
            Refresh
          </Button>
        }
      />

      <div className="flex items-center gap-2 rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
        <AlertTriangle size={15} className="flex-shrink-0" />
        <span>
          This is a reference estimate only, computed from confirmed bookings&apos; recorded profit.
          The incentive rate is a placeholder set in Company Settings — the real commission
          formula is still being finalized. HR should use this list manually when filling in
          Payroll&apos;s incentive field, not treat it as final.
        </span>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All months</option>
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <SkeletonTable rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<TrendingUp size={22} />}
          title="No confirmed bookings with profit recorded yet"
          description="Once Operations confirms bookings and records profit for a sales agent, their incentive estimate will show up here."
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Bookings</th>
                  <th className="px-4 py-3 text-right">Total Profit</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Incentive</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={`${s.agentId}-${s.year}-${s.month}`} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(s.agentName)}
                        </div>
                        <span className="font-medium text-foreground">{s.agentName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{MONTH_LABELS[s.month]} {s.year}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{s.bookingsCount}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(s.totalProfit)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{s.incentiveRatePercent}%</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">{formatCurrency(s.incentiveAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
