"use client";

import { useAuthStore } from "@/store/auth.store";
import { useCurrentEmployee }   from "@/modules/dashboard/hooks/useCurrentEmployee";
import { useAttendanceSummary } from "@/modules/dashboard/hooks/useAttendanceSummary";
import { useHrActionStats }     from "@/modules/dashboard/hooks/useHrActionStats";
import { useRelevantCompanyGoals } from "@/modules/dashboard/hooks/useRelevantCompanyGoals";
import { GreetingBanner }    from "@/modules/dashboard/components/GreetingBanner";
import { StatCard }          from "@/modules/dashboard/components/StatCard";
import { ProfileHeroCard }   from "@/modules/dashboard/components/ProfileHeroCard";
import { AvgHoursWeekCard }  from "@/modules/dashboard/components/AvgHoursWeekCard";
import { OnsiteRemoteSplit } from "@/modules/dashboard/components/OnsiteRemoteSplit";
import { HrActionQueueCard } from "@/modules/dashboard/components/HrActionQueueCard";
import { RelevantGoalsCard } from "@/modules/dashboard/components/RelevantGoalsCard";
import { ContinueTrainingCard } from "@/modules/dashboard/components/ContinueTrainingCard";
import { QuickClockCard }    from "@/modules/dashboard/components/QuickClockCard";
import { SkeletonCard } from "@/components/ui/Skeleton";

// Replaces the company-wide DashboardPage for the `hr` role — HR's queues
// (pending leave/attendance approvals, recruitment pipeline) instead of
// company-wide revenue/payroll/sales data unrelated to HR's own work.
export function HrPersonalDashboard() {
  const { user } = useAuthStore();
  const currentEmployee   = useCurrentEmployee();
  const attendanceSummary = useAttendanceSummary();
  const hr = useHrActionStats();
  const relevantGoals = useRelevantCompanyGoals(currentEmployee.employee?.department ?? null, currentEmployee.employee?.id ?? null);

  return (
    <div className="space-y-6">

      <GreetingBanner
        newLeads={hr.candidatesInPipeline}
        followUpCount={hr.pendingLeaves + hr.pendingRegularizations}
      />

      <QuickClockCard />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Pending Approvals"
          value={hr.pendingLeaves + hr.pendingRegularizations}
          sub={`${hr.pendingLeaves} leave · ${hr.pendingRegularizations} correction`}
          href="/hrms/leaves"
          featured
        />
        <StatCard
          label="Open Positions"
          value={hr.openJobOpenings}
          sub="Job openings currently open"
          href="/recruitment"
        />
        <StatCard
          label="Candidates in Pipeline"
          value={hr.candidatesInPipeline}
          sub="Not yet joined or rejected"
          href="/recruitment"
        />
        <StatCard
          label="Hires This Month"
          value={hr.hiresThisMonth}
          sub="Candidates marked joined"
          href="/recruitment"
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

          <HrActionQueueCard items={hr.oldestPending} loading={hr.loading} />

          <RelevantGoalsCard objectives={relevantGoals.objectives} loading={relevantGoals.loading} />

          <ContinueTrainingCard />

        </div>
      </div>

    </div>
  );
}
