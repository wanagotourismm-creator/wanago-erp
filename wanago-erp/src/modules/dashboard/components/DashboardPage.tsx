"use client";

import { useDashboard } from "@/modules/dashboard/hooks/useDashboard";
import { GreetingBanner } from "@/modules/dashboard/components/GreetingBanner";
import { StatCard }       from "@/modules/dashboard/components/StatCard";
import { RevenueChart }   from "@/modules/dashboard/components/RevenueChart";
import { LeadPipeline }   from "@/modules/dashboard/components/LeadPipeline";
import { SkeletonCard }   from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/utils/helpers";

export function DashboardPage() {
  const { stats, pipeline, revenue, loading } = useDashboard();

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard rows={2} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1,2,3,4].map(i => <SkeletonCard key={i} rows={2} />)}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2"><SkeletonCard rows={6} /></div>
          <SkeletonCard rows={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Greeting banner */}
      <GreetingBanner
        newLeads={stats?.newLeads ?? 0}
        followUpCount={stats?.followUpPending ?? 0}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          sub="From completed bookings"
          border="border-l-blue-500"
        />
        <StatCard
          label="Active Leads"
          value={stats?.activeLeads ?? 0}
          sub="In pipeline"
          border="border-l-purple-500"
        />
        <StatCard
          label="Confirmed Bookings"
          value={stats?.confirmedBookings ?? 0}
          sub={`${stats?.confirmedBookings ?? 0} total · CVR tracking`}
          border="border-l-green-500"
        />
        <StatCard
          label="Pending Dues"
          value={formatCurrency(stats?.pendingDues ?? 0)}
          sub={`${stats?.overdueInvoices ?? 0} overdue invoice${(stats?.overdueInvoices ?? 0) !== 1 ? "s" : ""}`}
          accent={( stats?.overdueInvoices ?? 0) > 0 ? "danger" : "default"}
          border="border-l-red-500"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={revenue} />
        </div>
        <LeadPipeline pipeline={pipeline} />
      </div>

    </div>
  );
}
