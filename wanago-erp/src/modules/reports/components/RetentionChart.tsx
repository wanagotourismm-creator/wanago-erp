"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import type { RetentionCohort } from "@/modules/reports/types";

export function RetentionChart({ cohorts }: { cohorts: RetentionCohort[] }) {
  if (cohorts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Retention by Signup Cohort</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            % of each month&apos;s new customers who rebooked within 90 / 180 days
          </p>
        </div>
      </CardHeader>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={cohorts} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
              tickFormatter={(v) => `${v}%`}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background:   "hsl(var(--card))",
                border:       "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize:     "12px",
              }}
              formatter={(v: number) => [`${v.toFixed(1)}%`, undefined]}
            />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Bar dataKey="pct90" name="Rebooked within 90d" fill="#228050" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pct180" name="Rebooked within 180d" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
