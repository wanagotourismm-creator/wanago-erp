"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Settings2 } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { fetchReviewRequests, fetchNpsResponses, computeNpsTrend, computeResponseRate, computeNpsSplit, computeNpsByGroup } from "@/modules/reviews/services/reviews.service";
import { useReviewSettings } from "@/modules/reviews/settings/hooks/useReviewSettings";
import { ReviewSettingsForm } from "@/modules/reviews/settings/components/ReviewSettingsForm";
import type { ReviewRequest, NpsResponse } from "@/modules/reviews/types";

type Tab = "overview" | "settings";
const TABS: { key: Tab; label: string; icon: typeof TrendingUp }[] = [
  { key: "overview", label: "Overview", icon: TrendingUp },
  { key: "settings", label: "Settings", icon: Settings2 },
];

function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</p>
      {sub && <p className="mt-2 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function GroupTable({ title, rows }: { title: string; rows: ReturnType<typeof computeNpsByGroup> }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No responses yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4">{title === "By Destination" ? "Destination" : "Agent"}</th>
                <th className="py-2 pr-4">Responses</th>
                <th className="py-2 pr-4">Avg Score</th>
                <th className="py-2 pr-4">Promoter</th>
                <th className="py-2 pr-4">Passive</th>
                <th className="py-2">Detractor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-4 font-medium text-foreground">{r.key}</td>
                  <td className="py-2 pr-4">{r.count}</td>
                  <td className="py-2 pr-4">{r.avgScore.toFixed(1)}</td>
                  <td className="py-2 pr-4 text-green-600">{r.promoter}</td>
                  <td className="py-2 pr-4 text-amber-600">{r.passive}</td>
                  <td className="py-2 text-destructive">{r.detractor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function ReputationDashboardPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [responses, setResponses] = useState<NpsResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings, loading: settingsLoading, saving, save } = useReviewSettings();

  useEffect(() => {
    Promise.all([fetchReviewRequests(), fetchNpsResponses()])
      .then(([r, n]) => { setRequests(r); setResponses(n); })
      .finally(() => setLoading(false));
  }, []);

  const trend = useMemo(() => computeNpsTrend(responses), [responses]);
  const responseRate = useMemo(() => computeResponseRate(requests), [requests]);
  const split = useMemo(() => computeNpsSplit(responses), [responses]);
  const byDestination = useMemo(() => computeNpsByGroup(responses, "destination"), [responses]);
  const byAgent = useMemo(() => computeNpsByGroup(responses, "agentName"), [responses]);

  const totalResponses = responses.length;
  const overallAvg = totalResponses === 0 ? null : responses.reduce((s, r) => s + r.score, 0) / totalResponses;

  return (
    <div>
      <PageHeader title="Reviews & NPS" description="Post-trip feedback, response rate, and reputation trend." />

      <div className="mb-6 flex gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "settings" ? (
        settingsLoading ? <SkeletonCard rows={4} /> : (
          <ReviewSettingsForm settings={settings} saving={saving} onSave={save} />
        )
      ) : loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1,2,3,4].map(i => <SkeletonCard key={i} rows={2} />)}
          </div>
          <SkeletonCard rows={6} />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Average NPS Score" value={overallAvg != null ? overallAvg.toFixed(1) : "—"} sub={`${totalResponses} response${totalResponses !== 1 ? "s" : ""}`} />
            <StatTile label="Response Rate" value={`${responseRate.toFixed(1)}%`} sub="Of requests sent" />
            <StatTile label="Promoters" value={split.promoter} sub="Score 9–10" />
            <StatTile label="Detractors" value={split.detractor} sub="Score 0–6 — auto-tickets" />
          </div>

          <Card>
            <CardHeader><CardTitle>NPS Trend (12 months)</CardTitle></CardHeader>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="npsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#228050" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#228050" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(v) => [typeof v === "number" ? v.toFixed(1) : "No data", "Avg score"]}
                  />
                  <Area type="monotone" dataKey="avgScore" stroke="#228050" strokeWidth={2} fill="url(#npsGrad)" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <GroupTable title="By Destination" rows={byDestination} />
            <GroupTable title="By Agent" rows={byAgent} />
          </div>
        </div>
      )}
    </div>
  );
}
