"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MousePointerClick, UserPlus2, CheckCircle2, TrendingUp, Trophy, PlusCircle, ImagePlus } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { HrStatCard } from "@/modules/hrms/overview/components/HrStatCard";
import { useReferralAnalytics } from "@/modules/referrals/hooks/useReferralAnalytics";
import { formatCurrency, timeAgo } from "@/lib/utils/helpers";
import type { ReferrerStat } from "@/modules/referrals/services/referral-analytics.service";

const MEDALS = ["🥇", "🥈", "🥉"];

type Props = {
  onSelectReferrer: (stat: ReferrerStat) => void;
  onAddExecutive: () => void;
  onManagePosters: () => void;
  enabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
};

export function ReferralAnalyticsDashboard({ onSelectReferrer, onAddExecutive, onManagePosters, enabled, onToggleEnabled }: Props) {
  const { analytics, loading } = useReferralAnalytics();

  if (loading || !analytics) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const chartData = analytics.weekly.map(w => ({ week: w.weekOf.slice(5), leads: w.leads, bookings: w.bookings }));

  const stats = [
    { label: "Link Clicks",   value: analytics.totalClicks,             icon: MousePointerClick, trend: analytics.clicksTrend },
    { label: "Leads Sent",    value: analytics.totalLeads,              icon: UserPlus2,          trend: analytics.leadsTrend },
    { label: "Bookings",      value: analytics.totalBookings,           icon: CheckCircle2,       trend: analytics.bookingsTrend },
    { label: "Revenue Generated", value: formatCurrency(analytics.totalRevenue), icon: TrendingUp, trend: analytics.revenueTrend },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Refer &amp; Earn — Live Overview</h2>
          <p className="text-sm text-muted-foreground">
            {analytics.clickToLeadRate.toFixed(0)}% of clicks become leads · {analytics.conversionRate.toFixed(0)}% of leads book
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
            <Switch checked={enabled} onChange={onToggleEnabled} />
            <span className="text-xs font-medium text-foreground">{enabled ? "Program Live" : "Program Off"}</span>
          </div>
          <Button size="sm" variant="outline" icon={<ImagePlus size={14} />} onClick={onManagePosters}>
            Manage Posters
          </Button>
          <Button size="sm" icon={<PlusCircle size={14} />} onClick={onAddExecutive}>
            Add Executive
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <HrStatCard key={s.label} label={s.label} value={s.value} icon={s.icon} trend={s.trend} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Referral Activity</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Leads sent vs. bookings confirmed, last 12 weeks</p>
            </div>
          </CardHeader>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="referralLeadsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#228050" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#228050" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="referralBookingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B8873B" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#B8873B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="leads" name="Leads" stroke="#228050" fill="url(#referralLeadsGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="bookings" name="Bookings" stroke="#B8873B" fill="url(#referralBookingsGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding="none">
          <div className="p-5 pb-3">
            <div className="flex items-center gap-2">
              <Trophy size={15} className="text-primary" />
              <CardTitle>Top Referrers</CardTitle>
            </div>
          </div>
          {analytics.leaderboard.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">No referral activity yet.</p>
          ) : (
            <div className="space-y-2 px-5 pb-5">
              {analytics.leaderboard.slice(0, 5).map((s, i) => (
                <button
                  key={`${s.referrerType}-${s.referrerId}`}
                  onClick={() => onSelectReferrer(s)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-left hover:border-primary/40 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="text-base">{MEDALS[i] ?? `${i + 1}.`}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{s.referrerName}</p>
                      <p className="text-[11px] text-muted-foreground">{s.leadsSent} leads · {s.bookings} bookings</p>
                    </div>
                  </div>
                  <span className="flex-shrink-0 text-sm font-semibold text-foreground">{formatCurrency(s.revenue)}</span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <div className="space-y-2">
          {analytics.recentActivity.length === 0 && (
            <p className="text-xs text-muted-foreground">No recent activity</p>
          )}
          {analytics.recentActivity.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                <p className="truncate text-sm text-foreground">{item.text}</p>
              </div>
              <span className="flex-shrink-0 text-xs text-muted-foreground">{timeAgo(item.timestamp)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
