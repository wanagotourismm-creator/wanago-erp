"use client";

import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { compactNumber, cn } from "@/lib/utils/helpers";
import { useSalesTrend } from "@/modules/reports/hooks/useSalesTrend";

function ChangeBadge({ label, pct }: { label: string; pct: number | null }) {
  if (pct == null) {
    return (
      <div className="rounded-xl border border-border bg-card px-3 py-2">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-muted-foreground">—</p>
      </div>
    );
  }
  const positive = pct >= 0;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("flex items-center gap-1 text-sm font-semibold", positive ? "text-green-600" : "text-destructive")}>
        {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        {positive ? "+" : ""}{pct.toFixed(1)}%
      </p>
    </div>
  );
}

export function SalesTrendChart() {
  const { points, momChangePct, yoyChangePct, loading, error } = useSalesTrend();

  if (loading) return <SkeletonTable rows={6} />;
  if (error) {
    return <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <ChangeBadge label="Month over Month" pct={momChangePct} />
        <ChangeBadge label="Year over Year" pct={yoyChangePct} />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Sales Trend</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Confirmed booking revenue by month, with a 3-month moving average
            </p>
          </div>
        </CardHeader>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="salesTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#228050" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#228050" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => compactNumber(v)}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background:   "hsl(var(--card))",
                  border:       "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize:     "12px",
                }}
                formatter={(v: number, name: string) => [`₹${compactNumber(v)}`, name]}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#228050"
                strokeWidth={2}
                fill="url(#salesTrendGrad)"
              />
              <Line
                type="monotone"
                dataKey="movingAverage"
                name="3-Month Average"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
