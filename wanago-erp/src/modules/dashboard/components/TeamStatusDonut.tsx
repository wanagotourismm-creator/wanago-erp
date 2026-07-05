"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import type { DeptCount } from "@/modules/dashboard/hooks/useEmployeeBreakdown";

type Props = { total: number; departments: DeptCount[] };

export function TeamStatusDonut({ total, departments }: Props) {
  const chartData = departments.length ? departments : [{ department: "None", count: 1, color: "hsl(var(--muted))" }];

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Track Your Team</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">Active headcount by department</p>
        </div>
      </CardHeader>

      <div className="flex items-center gap-4">
        <div className="relative h-32 w-32 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="count" nameKey="department" innerRadius={38} outerRadius={56} paddingAngle={2} stroke="none">
                {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xl font-bold text-foreground">{total}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {departments.length === 0 && <p className="text-xs text-muted-foreground">No active employees yet</p>}
          {departments.slice(0, 4).map((d) => (
            <div key={d.department} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-1.5 truncate text-muted-foreground">
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: d.color }} />
                <span className="truncate">{d.department}</span>
              </span>
              <span className="flex-shrink-0 font-semibold text-foreground">{d.count}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
