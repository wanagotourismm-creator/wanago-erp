"use client";

import { useMemo, useState } from "react";
import { Info, RefreshCw, TrendingUp, Settings2, Trophy } from "lucide-react";
import { useIncentives } from "@/modules/incentives/hooks/useIncentives";
import { useIncentiveSettings } from "@/modules/incentives/settings/hooks/useIncentiveSettings";
import { IncentiveSettingsForm } from "@/modules/incentives/settings/components/IncentiveSettingsForm";
import { computeMonthlyRewards, computeQuarterlyRewards } from "@/modules/incentives/lib/calculateIncentives";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable, SkeletonCard } from "@/components/ui/Skeleton";
import { formatCurrency, initials, cn } from "@/lib/utils/helpers";
import { useAuthStore } from "@/store/auth.store";
import type { AgentIncentiveSummary } from "@/modules/incentives/types";

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

// Compact "Base ₹X · Fast-closure ₹Y · ..." line, only non-zero components.
function breakdownLine(s: AgentIncentiveSummary): string {
  const parts: string[] = [];
  if (s.baseIncentive > 0)      parts.push(`Base ${formatCurrency(s.baseIncentive)}`);
  if (s.fastClosureBonus > 0)   parts.push(`Fast-closure ${formatCurrency(s.fastClosureBonus)}`);
  if (s.highValueBonus > 0)     parts.push(`High-value ${formatCurrency(s.highValueBonus)}`);
  if (s.selfGeneratedBonus > 0) parts.push(`Self-gen ${formatCurrency(s.selfGeneratedBonus)}`);
  if (s.teamBonus > 0)          parts.push(`Team ${formatCurrency(s.teamBonus)}`);
  return parts.join(" · ");
}

type Tab = "overview" | "settings" | "rewards";

const TABS: { key: Tab; label: string; icon: typeof TrendingUp }[] = [
  { key: "overview", label: "Overview", icon: TrendingUp },
  { key: "rewards",  label: "Rewards",  icon: Trophy },
  { key: "settings", label: "Settings", icon: Settings2 },
];

export function IncentivesPage() {
  const { user } = useAuthStore();
  const { summaries, loading, reload } = useIncentives();
  const { settings, loading: settingsLoading, saving, save } = useIncentiveSettings();

  const monthOptions = useMemo(buildMonthOptions, []);
  const [selected, setSelected] = useState("all");
  const [tab, setTab] = useState<Tab>("overview");

  // Only Admin/Sales Head set the incentive structure — Finance/HR can view
  // Overview/Rewards to verify the numbers but never edit Settings.
  const canManageSettings = !!user && (
    user.systemRole === "admin" || user.systemRole === "super_admin" || user.systemRole === "sales_head"
  );
  const visibleTabs = TABS.filter((t) => t.key !== "settings" || canManageSettings);

  const filtered = useMemo(() => {
    if (selected === "all") return summaries;
    const [year, month] = selected.split("-").map(Number);
    return summaries.filter((s) => s.year === year && s.month === month);
  }, [summaries, selected]);

  const now = new Date();
  const rewardsMonth = selected === "all" ? now.getMonth() : Number(selected.split("-")[1]);
  const rewardsYear  = selected === "all" ? now.getFullYear() : Number(selected.split("-")[0]);

  const monthlyRewards = useMemo(
    () => computeMonthlyRewards(summaries, rewardsMonth, rewardsYear, settings),
    [summaries, rewardsMonth, rewardsYear, settings]
  );
  const quarterlyRewards = useMemo(
    () => computeQuarterlyRewards(summaries, settings),
    [summaries, settings]
  );

  return (
    <div className="space-y-5">

      <PageHeader
        title="Sales Incentives"
        tourId="tour-incentives-header"
        description="Computed per the current Sales Incentive Structure — configure rates, thresholds, and toggles in the Settings tab."
        actions={
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => reload()} data-tour-id="tour-incentives-refresh">
            Refresh
          </Button>
        }
      />

      <div className="flex items-center gap-1 border-b border-border">
        {visibleTabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors -mb-px",
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab !== "settings" && (
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
      )}

      {tab === "overview" && (
        loading ? (
          <SkeletonTable rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<TrendingUp size={22} />}
            title="No confirmed bookings with profit recorded yet"
            description="Once Operations confirms bookings and records profit for a sales agent, their incentive will show up here."
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
                    <th className="px-4 py-3 text-right">Achievement</th>
                    <th className="px-4 py-3 text-right">Incentive</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const breakdown = breakdownLine(s);
                    return (
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
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-muted-foreground">{s.pctAchieved.toFixed(0)}%</span>
                            <Badge variant="outline">{s.tierLabel}</Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-semibold text-foreground">{formatCurrency(s.incentiveAmount)}</div>
                          {breakdown && (
                            <div className="mt-0.5 text-[11px] text-muted-foreground">{breakdown}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {tab === "settings" && (
        canManageSettings ? (
          settingsLoading ? (
            <SkeletonCard rows={6} />
          ) : (
            <IncentiveSettingsForm settings={settings} saving={saving} onSave={save} />
          )
        ) : (
          <EmptyState
            icon={<Info size={22} />}
            title="You don't have permission to edit incentive settings"
            description="Ask an admin to make changes to the Sales Incentive Structure."
          />
        )
      )}

      {tab === "rewards" && (
        loading ? (
          <SkeletonTable rows={3} />
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border bg-muted/50 px-4 py-3">
                <p className="text-sm font-semibold text-foreground">
                  Top Performers — {MONTH_LABELS[rewardsMonth]} {rewardsYear}
                </p>
              </div>
              {monthlyRewards.length === 0 ? (
                <EmptyState
                  icon={<Trophy size={22} />}
                  title="No one hit 100% of target yet this month"
                  description="Top 3 agents who reach 100%+ of their monthly profit target will be listed here."
                />
              ) : (
                <div className="divide-y divide-border">
                  {monthlyRewards.map((r) => (
                    <div key={r.agentId} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        #{r.rank}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{r.agentName}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(r.totalProfit)} profit</p>
                      </div>
                      <div className="text-sm font-semibold text-foreground">{formatCurrency(r.rewardAmount)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {quarterlyRewards.length > 0 && (
              <div className="space-y-2">
                {quarterlyRewards.map((r) => (
                  <div key={r.agentId} className="flex items-center gap-3 rounded-xl border-2 border-amber-300/60 bg-amber-50 dark:bg-amber-900/10 p-4">
                    <span className="text-2xl flex-shrink-0">🏆</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {r.agentName} — 3 months running as top performer
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.note} · {formatCurrency(r.cashAmount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      )}

    </div>
  );
}
