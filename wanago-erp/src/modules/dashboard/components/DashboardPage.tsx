"use client";

import { useDashboard }         from "@/modules/dashboard/hooks/useDashboard";
import { GreetingBanner }       from "@/modules/dashboard/components/GreetingBanner";
import { StatCard }             from "@/modules/dashboard/components/StatCard";
import { RevenueChart }         from "@/modules/dashboard/components/RevenueChart";
import { LeadPipeline }         from "@/modules/dashboard/components/LeadPipeline";
import { RevenueForecast }      from "@/modules/dashboard/components/RevenueForecast";
import { SmartRecommendations } from "@/modules/dashboard/components/SmartRecommendations";
import { TopPerformers }        from "@/modules/dashboard/components/TopPerformers";
import { DepartingSoon }        from "@/modules/dashboard/components/DepartingSoon";
import { RecentActivity }       from "@/modules/dashboard/components/RecentActivity";
import { SkeletonCard }         from "@/components/ui/Skeleton";
import { formatCurrency }       from "@/lib/utils/helpers";

export function DashboardPage() {
  const { stats, pipeline, revenue, loading } = useDashboard();

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard rows={1} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1,2,3,4].map(i => <SkeletonCard key={i} rows={2} />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2"><SkeletonCard rows={6} /></div>
          <SkeletonCard rows={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Greeting row */}
      <GreetingBanner
        newLeads={stats?.newLeads ?? 0}
        followUpCount={stats?.followUpPending ?? 0}
      />

      {/* Stat cards — first one is featured (dark green) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          sub="From completed bookings"
          featured
        />
        <StatCard
          label="Active Leads"
          value={stats?.activeLeads ?? 0}
          sub="In pipeline right now"
        />
        <StatCard
          label="Confirmed Bookings"
          value={stats?.confirmedBookings ?? 0}
          sub={`${stats?.confirmedBookings ?? 0} total · 0.0% CVR`}
        />
        <StatCard
          label="Pending Dues"
          value={formatCurrency(stats?.pendingDues ?? 0)}
          sub={`${stats?.overdueInvoices ?? 0} overdue invoice${(stats?.overdueInvoices ?? 0) !== 1 ? "s" : ""}`}
        />
      </div>

      {/* Revenue chart + Pipeline */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={revenue} />
        </div>
        <LeadPipeline pipeline={pipeline} />
      </div>

      {/* Forecast */}
      <RevenueForecast data={revenue} />

      {/* Recommendations + Top Performers */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SmartRecommendations />
        <TopPerformers />
      </div>

      {/* Departing + Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DepartingSoon />
        <RecentActivity />
      </div>

    </div>
  );
}
