"use client";

import { useDashboard }         from "@/modules/dashboard/hooks/useDashboard";
import { useCurrentEmployee }   from "@/modules/dashboard/hooks/useCurrentEmployee";
import { useAttendanceSummary } from "@/modules/dashboard/hooks/useAttendanceSummary";
import { useEmployeeBreakdown } from "@/modules/dashboard/hooks/useEmployeeBreakdown";
import { useHiringStats }       from "@/modules/dashboard/hooks/useHiringStats";
import { usePayoutSummary }     from "@/modules/dashboard/hooks/usePayoutSummary";
import { useAuthStore }         from "@/store/auth.store";
import { GreetingBanner }       from "@/modules/dashboard/components/GreetingBanner";
import { StatCard }             from "@/modules/dashboard/components/StatCard";
import { ProfileHeroCard }      from "@/modules/dashboard/components/ProfileHeroCard";
import { AvgHoursWeekCard }     from "@/modules/dashboard/components/AvgHoursWeekCard";
import { OnsiteRemoteSplit }    from "@/modules/dashboard/components/OnsiteRemoteSplit";
import { RevenueChart }         from "@/modules/dashboard/components/RevenueChart";
import { LeadPipeline }         from "@/modules/dashboard/components/LeadPipeline";
import { RevenueForecast }      from "@/modules/dashboard/components/RevenueForecast";
import { TeamStatusDonut }      from "@/modules/dashboard/components/TeamStatusDonut";
import { HiringStatsCard }      from "@/modules/dashboard/components/HiringStatsCard";
import { SmartRecommendations } from "@/modules/dashboard/components/SmartRecommendations";
import { MySalesProgress }      from "@/modules/dashboard/components/MySalesProgress";
import { TopPerformers }        from "@/modules/dashboard/components/TopPerformers";
import { DepartingSoon }        from "@/modules/dashboard/components/DepartingSoon";
import { RecentActivity }       from "@/modules/dashboard/components/RecentActivity";
import { PayoutPanel }          from "@/modules/dashboard/components/PayoutPanel";
import { PayrollSummaryCard }   from "@/modules/dashboard/components/PayrollSummaryCard";
import { PendingDuesPanel }     from "@/modules/dashboard/components/PendingDuesPanel";
import { InternationalFollowUps } from "@/modules/dashboard/components/InternationalFollowUps";
import { SkeletonCard }         from "@/components/ui/Skeleton";
import { formatCurrency }       from "@/lib/utils/helpers";

export function DashboardPage() {
  const { stats, pipeline, revenue, loading } = useDashboard();
  const { user } = useAuthStore();
  const currentEmployee   = useCurrentEmployee();
  const attendanceSummary = useAttendanceSummary();
  const employeeBreakdown = useEmployeeBreakdown();
  const hiringStats       = useHiringStats();
  const payoutSummary     = usePayoutSummary();

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
          href="/payments"
          featured
        />
        <StatCard
          label="Active Leads"
          value={stats?.activeLeads ?? 0}
          sub="In pipeline right now"
          href="/leads"
        />
        <StatCard
          label="Confirmed Bookings"
          value={stats?.confirmedBookings ?? 0}
          sub={`${stats?.confirmedBookings ?? 0} total · ${
            stats?.totalLeads ? ((stats.confirmedBookings / stats.totalLeads) * 100).toFixed(1) : "0.0"
          }% CVR`}
          href="/bookings"
        />
        <StatCard
          label="Pending Dues"
          value={formatCurrency(stats?.pendingDues ?? 0)}
          sub={`${stats?.overdueInvoices ?? 0} overdue invoice${(stats?.overdueInvoices ?? 0) !== 1 ? "s" : ""}`}
          href="/invoices"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* Left column */}
        <div className="space-y-6 xl:col-span-2">

          {/* Profile hero + hours + onsite/remote */}
          {currentEmployee.loading || attendanceSummary.loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[1,2,3].map(i => <SkeletonCard key={i} rows={4} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ProfileHeroCard
                employee={currentEmployee.employee}
                fallbackName={user?.displayName ?? "Team Member"}
                fallbackPhotoUrl={user?.photoURL ?? null}
              />
              <AvgHoursWeekCard days={attendanceSummary.days} weeklyAvgHours={attendanceSummary.weeklyAvgHours} />
              <OnsiteRemoteSplit officePct={attendanceSummary.officePct} wfhPct={attendanceSummary.wfhPct} />
            </div>
          )}

          {/* Revenue chart + Pipeline */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RevenueChart data={revenue} />
            </div>
            <LeadPipeline pipeline={pipeline} />
          </div>

          {/* Forecast */}
          <RevenueForecast data={revenue} />

          {/* Team + Hiring */}
          {employeeBreakdown.loading || hiringStats.loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <SkeletonCard rows={5} />
              <SkeletonCard rows={5} />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <TeamStatusDonut total={employeeBreakdown.total} departments={employeeBreakdown.departments} />
              <HiringStatsCard
                candidates={hiringStats.candidates}
                matched={hiringStats.matched}
                notMatched={hiringStats.notMatched}
                openOpenings={hiringStats.openOpenings}
              />
            </div>
          )}

          {/* Sales-only motivational widget */}
          <MySalesProgress />

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

          {/* Pending Dues + International Follow-Ups */}
          <div className="grid gap-4 lg:grid-cols-2">
            <PendingDuesPanel />
            <InternationalFollowUps />
          </div>

        </div>

        {/* Right column — payroll panel */}
        <div className="space-y-6">
          {payoutSummary.loading ? (
            <>
              <SkeletonCard rows={6} />
              <SkeletonCard rows={4} />
            </>
          ) : (
            <>
              <PayoutPanel rows={payoutSummary.rows} />
              <PayrollSummaryCard
                basicSalary={payoutSummary.totals.basicSalary}
                bonus={payoutSummary.totals.bonus}
                incentives={payoutSummary.totals.incentives}
                netSalary={payoutSummary.totals.netSalary}
                employeeCount={payoutSummary.employeeCount}
                month={payoutSummary.month}
                year={payoutSummary.year}
              />
            </>
          )}
        </div>

      </div>

    </div>
  );
}
