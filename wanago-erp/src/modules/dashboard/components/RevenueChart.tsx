"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { compactNumber } from "@/lib/utils/helpers";
import type { RevenueDataPoint } from "@/modules/dashboard/types";

type Props = {
  data: RevenueDataPoint[];
};

export function RevenueChart({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Revenue Overview</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monthly collected payments
          </p>
        </div>
      </CardHeader>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
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
              formatter={(v: number) => [`₹${compactNumber(v)}`, "Revenue"]}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#228050"
              strokeWidth={2}
              fill="url(#revenueGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
