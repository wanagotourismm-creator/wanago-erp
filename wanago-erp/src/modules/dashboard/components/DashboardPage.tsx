"use client";

import { useState } from "react";
import { useDashboard }         from "@/modules/dashboard/hooks/useDashboard";
import { useCurrentEmployee }   from "@/modules/dashboard/hooks/useCurrentEmployee";
import { useAttendanceSummary } from "@/modules/dashboard/hooks/useAttendanceSummary";
import { useEmployeeBreakdown } from "@/modules/dashboard/hooks/useEmployeeBreakdown";
import { useDashboardEmployees } from "@/modules/dashboard/hooks/useDashboardEmployees";
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
import { InsightsCard }         from "@/modules/dashboard/components/InsightsCard";
import { FounderBriefingCard }  from "@/modules/dashboard/components/FounderBriefingCard";
import { CockpitFilters }       from "@/modules/dashboard/components/CockpitFilters";
import { AlertsFeed }           from "@/modules/dashboard/components/AlertsFeed";
import { TeamStatusDonut }      from "@/modules/dashboard/components/TeamStatusDonut";
import { HiringStatsCard }      from "@/modules/dashboard/components/HiringStatsCard";
import { SmartRecommendations } from "@/modules/dashboard/components/SmartRecommendations";
import { TopPerformers }        from "@/modules/dashboard/components/TopPerformers";
import { WeeklyLeaderboardCard } from "@/modules/dashboard/components/WeeklyLeaderboardCard";
import { DepartingSoon }        from "@/modules/dashboard/components/DepartingSoon";
import { RecentActivity }       from "@/modules/dashboard/components/RecentActivity";
import { PayoutPanel }          from "@/modules/dashboard/components/PayoutPanel";
import { PayrollSummaryCard }   from "@/modules/dashboard/components/PayrollSummaryCard";
import { PendingDuesPanel }     from "@/modules/dashboard/components/PendingDuesPanel";
import { InternationalFollowUps } from "@/modules/dashboard/components/InternationalFollowUps";
import { ContinueTrainingCard }   from "@/modules/dashboard/components/ContinueTrainingCard";
import { SalesPersonalDashboard }      from "@/modules/dashboard/components/SalesPersonalDashboard";
import { MarketingPersonalDashboard }  from "@/modules/dashboard/components/MarketingPersonalDashboard";
import { HrPersonalDashboard }         from "@/modules/dashboard/components/HrPersonalDashboard";
import { FinancePersonalDashboard }    from "@/modules/dashboard/components/FinancePersonalDashboard";
import { OperationsPersonalDashboard } from "@/modules/dashboard/components/OperationsPersonalDashboard";
import { SkeletonCard }         from "@/components/ui/Skeleton";
import { formatCurrency }       from "@/lib/utils/helpers";
import type { CockpitFilters as CockpitFiltersType } from "@/modules/dashboard/types";

function defaultCockpitFilters(): CockpitFiltersType {
  return {
    officeId:   "all",
    rangeStart: new Date(new Date().setDate(new Date().getDate() - 30)),
    rangeEnd:   new Date(),
  };
}

// Every non-admin role gets a dashboard scoped to their own department's
// work instead of the company-wide view below (which includes things like
// full company payroll and every other department's data that, say, a
// sales rep or an HR user has no reason to see). Admin/Super Admin keep
// the full company-wide dashboard.
const PERSONAL_DASHBOARDS: Partial<Record<string, React.ComponentType>> = {
  sales:       SalesPersonalDashboard,
  marketing:   MarketingPersonalDashboard,
  hr:          HrPersonalDashboard,
  finance:     FinancePersonalDashboard,
  operations:  OperationsPersonalDashboard,
};

export function DashboardPage() {
  const { user } = useAuthStore();

  const PersonalDashboard = user?.systemRole ? PERSONAL_DASHBOARDS[user.systemRole] : undefined;
  if (PersonalDashboard) {
    return <PersonalDashboard />;
  }

  return <CompanyWideDashboard />;
}

function CompanyWideDashboard() {
  const [cockpitFilters, setCockpitFilters] = useState<CockpitFiltersType>(defaultCockpitFilters);
  const { stats, pipeline, revenue, bookings, alerts, loading, error } = useDashboard(cockpitFilters);
  const { user } = useAuthStore();
  const currentEmployee   = useCurrentEmployee();
  const attendanceSummary = useAttendanceSummary();
  const dashboardEmployees = useDashboardEmployees();
  const employeeBreakdown = useEmployeeBreakdown(dashboardEmployees.employees, dashboardEmployees.loading);
  const hiringStats       = useHiringStats();
  const payoutSummary     = usePayoutSummary(dashboardEmployees.employees, dashboardEmployees.loading);

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

      {error && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400">
          {error}
        </div>
      )}

      {/* Greeting row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <GreetingBanner
          newLeads={stats?.newLeads ?? 0}
          followUpCount={stats?.followUpPending ?? 0}
        />
        <CockpitFilters filters={cockpitFilters} onChange={setCockpitFilters} />
      </div>

      <FounderBriefingCard />

      {/* Stat cards — first one is featured (dark green) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          sub="From completed bookings"
          href="/payments"
          featured
          tourId="tour-dashboard-revenue"
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

      {/* Executive cockpit tiles — cash/margin/pipeline read straight off
          existing module data (no GL/BI engine yet, see dashboard/types) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Cash Position"
          value={formatCurrency(stats?.cashPosition ?? 0)}
          sub="Payments in − paid expenses, in range"
          href="/payments"
        />
        <StatCard
          label="Gross Margin"
          value={stats?.grossMarginPct != null ? `${stats.grossMarginPct.toFixed(1)}%` : "—"}
          sub="Confirmed/completed bookings"
          href="/bookings"
        />
        <StatCard
          label="Open Pipeline Value"
          value={formatCurrency(stats?.pipelineValue ?? 0)}
          sub="Active leads' stated budget"
          href="/leads"
        />
        <StatCard
          label="AR Overdue"
          value={formatCurrency(stats?.arOverdueAmount ?? 0)}
          sub="Overdue invoice balance"
          href="/invoices"
        />
      </div>

      <AlertsFeed alerts={alerts} loading={loading} />

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

          {/* Forecast + Insights */}
          <div className="grid gap-4 lg:grid-cols-2">
            <RevenueForecast data={revenue} />
            <InsightsCard bookings={bookings} loading={loading} />
          </div>

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

          {/* Recommendations + Top Performers */}
          <div className="grid gap-4 lg:grid-cols-2">
            <SmartRecommendations />
            <TopPerformers bookings={bookings} loading={loading} />
          </div>

          <WeeklyLeaderboardCard />

          {/* Onboarding training — only renders when something's actionable */}
          <ContinueTrainingCard />

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
