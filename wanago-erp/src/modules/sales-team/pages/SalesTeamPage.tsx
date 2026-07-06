"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Users } from "lucide-react";
import { useSalesTeamPerformance } from "@/modules/sales-team/hooks/useSalesTeamPerformance";
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

export function SalesTeamPage() {
  const { performance, loading, reload } = useSalesTeamPerformance();
  const monthOptions = useMemo(buildMonthOptions, []);
  const [selected, setSelected] = useState(monthOptions[0].value);

  const filtered = useMemo(() => {
    const [year, month] = selected.split("-").map(Number);
    return performance.filter((p) => p.year === year && p.month === month);
  }, [performance, selected]);

  return (
    <div className="space-y-5">

      <PageHeader
        title="Sales Team Performance"
        description="Leads, conversion, revenue and incentive estimate per sales agent"
        actions={
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => reload()}>
            Refresh
          </Button>
        }
      />

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
