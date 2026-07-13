"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MousePointerClick, UserPlus2, CheckCircle2, TrendingUp, Trophy } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { useReferralAnalytics } from "@/modules/referrals/hooks/useReferralAnalytics";
import { formatCurrency } from "@/lib/utils/helpers";
import type { ReferrerStat } from "@/modules/referrals/services/referral-analytics.service";

function StatTile({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon size={14} />
        <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];

type Props = {
  onSelectReferrer: (stat: ReferrerStat) => void;
};

export function ReferralAnalyticsDashboard({ onSelectReferrer }: Props) {
  const { analytics, loading } = useReferralAnalytics();

  if (loading || !analytics) {
    return <div className="flex h-48 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const chartData = analytics.weekly.map(w => ({ week: w.weekOf.slice(5), leads: w.leads, bookings: w.bookings }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={MousePointerClick} label="Link Clicks" value={String(analytics.totalClicks)} sub={`${analytics.clickToLeadRate.toFixed(0)}% became leads`} />
        <StatTile icon={UserPlus2} label="Leads Sent" value={String(analytics.totalLeads)} />
        <StatTile icon={CheckCircle2} label="Bookings" value={String(analytics.totalBookings)} sub={`${analytics.conversionRate.toFixed(0)}% of leads`} />
        <StatTile icon={TrendingUp} label="Revenue Generated" value={formatCurrency(analytics.totalRevenue)} sub={`${formatCurrency(analytics.totalBonusPending)} bonus pending`} />
      </div>

      <Card>
        <CardTitle>Referral Activity — Last 12 Weeks</CardTitle>
        <p className="mb-3 mt-0.5 text-xs text-muted-foreground">Leads sent vs. bookings confirmed, by week</p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="bookingsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#B8873B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#B8873B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="leads" name="Leads" stroke="hsl(var(--primary))" fill="url(#leadsGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="bookings" name="Bookings" stroke="#B8873B" fill="url(#bookingsGrad)" strokeWidth={2} />
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/30">
                  {["#", "Referrer", "Clicks", "Leads", "Bookings", "Revenue"].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analytics.leaderboard.slice(0, 10).map((s, i) => (
                  <tr
                    key={`${s.referrerType}-${s.referrerId}`}
                    onClick={() => onSelectReferrer(s)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-base">{MEDALS[i] ?? i + 1}</td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {s.referrerName}
                      <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                        {s.referrerType === "partner" ? "· Freelance" : "· Customer"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.clicks}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.leadsSent}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.bookings}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{formatCurrency(s.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
