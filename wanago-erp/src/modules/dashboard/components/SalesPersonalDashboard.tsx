"use client";

import { useAuthStore } from "@/store/auth.store";
import { useCurrentEmployee }   from "@/modules/dashboard/hooks/useCurrentEmployee";
import { useAttendanceSummary } from "@/modules/dashboard/hooks/useAttendanceSummary";
import { useMyPipelineStats }   from "@/modules/dashboard/hooks/useMyPipelineStats";
import { useMyRank }            from "@/modules/dashboard/hooks/useMyRank";
import { useRelevantCompanyGoals } from "@/modules/dashboard/hooks/useRelevantCompanyGoals";
import { GreetingBanner }    from "@/modules/dashboard/components/GreetingBanner";
import { StatCard }          from "@/modules/dashboard/components/StatCard";
import { ProfileHeroCard }   from "@/modules/dashboard/components/ProfileHeroCard";
import { AvgHoursWeekCard }  from "@/modules/dashboard/components/AvgHoursWeekCard";
import { OnsiteRemoteSplit } from "@/modules/dashboard/components/OnsiteRemoteSplit";
import { MySalesProgress }   from "@/modules/dashboard/components/MySalesProgress";
import { MyRankCard }        from "@/modules/dashboard/components/MyRankCard";
import { RelevantGoalsCard } from "@/modules/dashboard/components/RelevantGoalsCard";
import { ContinueTrainingCard } from "@/modules/dashboard/components/ContinueTrainingCard";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/utils/helpers";

// Replaces the company-wide DashboardPage for the `sales` role: everything
// here is scoped to the logged-in rep's own leads/bookings/goals instead of
// the whole company's — including not showing company-wide payroll,
// revenue, or other departments' data that a sales rep has no reason to see.
export function SalesPersonalDashboard() {
  const { user } = useAuthStore();
  const currentEmployee   = useCurrentEmployee();
  const attendanceSummary = useAttendanceSummary();
  const employeeId = currentEmployee.employee?.id ?? null;
  const pipeline = useMyPipelineStats(employeeId);
  const rank = useMyRank(employeeId);
  const relevantGoals = useRelevantCompanyGoals(currentEmployee.employee?.department ?? null, employeeId);

  return (
    <div className="space-y-6">

      <GreetingBanner
        newLeads={pipeline.activeLeads}
        followUpCount={pipeline.followUpPending}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="My Active Leads"
          value={pipeline.activeLeads}
          sub={`${pipeline.followUpPending} awaiting follow-up`}
          href="/leads"
          featured
        />
        <StatCard
          label="My Bookings This Month"
          value={pipeline.bookingsThisMonth}
          sub={`${pipeline.conversionRate.toFixed(0)}% conversion this month`}
          href="/bookings"
        />
        <StatCard
          label="My Revenue This Month"
          value={formatCurrency(pipeline.revenueThisMonth)}
          sub="From confirmed bookings"
          href="/bookings"
        />
        <StatCard
          label="My Profit This Month"
          value={formatCurrency(pipeline.profitThisMonth)}
          sub="Drives your incentive"
          href="/incentives"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">

          {currentEmployee.loading || attendanceSummary.loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[1, 2, 3].map(i => <SkeletonCard key={i} rows={4} />)}
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

          <MySalesProgress />

          <RelevantGoalsCard objectives={relevantGoals.objectives} loading={relevantGoals.loading} />

          <ContinueTrainingCard />

        </div>

        <div className="space-y-6">
          <MyRankCard rank={rank} loading={rank.loading} />
        </div>
      </div>

    </div>
  );
}
