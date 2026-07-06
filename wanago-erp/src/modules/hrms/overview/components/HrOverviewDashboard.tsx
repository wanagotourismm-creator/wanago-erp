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
import {
  Users, UserPlus, Briefcase, CheckCircle2, CalendarOff, Target,
  PlusCircle, Send, ThumbsUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn, timeAgo } from "@/lib/utils/helpers";
import { useHrOverview } from "@/modules/hrms/overview/hooks/useHrOverview";
import { useEmployeeBreakdown } from "@/modules/dashboard/hooks/useEmployeeBreakdown";
import { TeamStatusDonut } from "@/modules/dashboard/components/TeamStatusDonut";
import { HrStatCard } from "@/modules/hrms/overview/components/HrStatCard";
import { HrTodayAttendanceList } from "@/modules/hrms/overview/components/HrOverviewContent";

type Props = {
  onAddEmployee: () => void;
  onPostJob: () => void;
  onApproveLeave: () => void;
};

export function HrOverviewDashboard({ onAddEmployee, onPostJob, onApproveLeave }: Props) {
  const {
    loading, employeesToday,
    headcount, attendancePct,
    headcountTrendPct, attendanceTrend,
    newHiresThisMonth, newHiresTrend,
    openJobsCount, jobsTrend,
    pendingLeavesCount, pendingLeavesTrend,
    upcomingReviewsCount, reviewsTrend,
    headcountTrend, upcomingEvents, recentActivity,
  } = useHrOverview();
  const { total: deptTotal, departments } = useEmployeeBreakdown();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const stats = [
    { label: "Total Employees",   value: headcount,             icon: Users,        trend: headcountTrendPct },
    { label: "New Hires",         value: newHiresThisMonth,     icon: UserPlus,     trend: newHiresTrend },
    { label: "Open Positions",    value: openJobsCount,         icon: Briefcase,    trend: jobsTrend },
    { label: "Attendance Rate",   value: `${attendancePct}%`,   icon: CheckCircle2, trend: attendanceTrend },
    { label: "Pending Leaves",    value: pendingLeavesCount,    icon: CalendarOff,  trend: pendingLeavesTrend },
    { label: "Upcoming Reviews",  value: upcomingReviewsCount,  icon: Target,       trend: reviewsTrend },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Overview</h2>
          <p className="text-sm text-muted-foreground">A snapshot of your workforce, right now</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" icon={<Send size={14} />} onClick={onPostJob}>
            Post Job
          </Button>
          <Button size="sm" variant="outline" icon={<ThumbsUp size={14} />} onClick={onApproveLeave}>
            Approve Leave
          </Button>
          <Button size="sm" icon={<PlusCircle size={14} />} onClick={onAddEmployee}>
            Add Employee
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <HrStatCard key={s.label} label={s.label} value={s.value} icon={s.icon} trend={s.trend} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Headcount Trend</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Active employees over the last 12 months</p>
            </div>
          </CardHeader>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={headcountTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="headcountGrad" x1="0" y1="0" x2="0" y2="1">
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
                  width={40}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background:   "hsl(var(--card))",
                    border:       "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize:     "12px",
                  }}
                  formatter={(v: number) => [v, "Headcount"]}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#228050"
                  strokeWidth={2}
                  fill="url(#headcountGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <TeamStatusDonut total={deptTotal} departments={departments} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {recentActivity.length === 0 && (
              <p className="text-xs text-muted-foreground">No recent activity</p>
            )}
            {recentActivity.map((item) => (
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

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {upcomingEvents.length === 0 && (
              <p className="text-xs text-muted-foreground">Nothing scheduled</p>
            )}
            {upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={cn(
                    "flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                    event.type === "review"
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  )}>
                    {event.type === "review" ? "Review" : "Leave"}
                  </span>
                  <p className="truncate text-sm text-foreground">{event.label}</p>
                </div>
                <span className="flex-shrink-0 text-xs text-muted-foreground">{event.date}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <HrTodayAttendanceList employeesToday={employeesToday} />
    </div>
  );
}
