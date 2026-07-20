"use client";

import { useAuthStore } from "@/store/auth.store";
import { useCurrentEmployee }   from "@/modules/dashboard/hooks/useCurrentEmployee";
import { useAttendanceSummary } from "@/modules/dashboard/hooks/useAttendanceSummary";
import { useOperationsActionStats } from "@/modules/dashboard/hooks/useOperationsActionStats";
import { useRelevantCompanyGoals } from "@/modules/dashboard/hooks/useRelevantCompanyGoals";
import { GreetingBanner }    from "@/modules/dashboard/components/GreetingBanner";
import { StatCard }          from "@/modules/dashboard/components/StatCard";
import { ProfileHeroCard }   from "@/modules/dashboard/components/ProfileHeroCard";
import { AvgHoursWeekCard }  from "@/modules/dashboard/components/AvgHoursWeekCard";
import { OnsiteRemoteSplit } from "@/modules/dashboard/components/OnsiteRemoteSplit";
import { OpsApprovalQueueCard } from "@/modules/dashboard/components/OpsApprovalQueueCard";
import { RelevantGoalsCard } from "@/modules/dashboard/components/RelevantGoalsCard";
import { ContinueTrainingCard } from "@/modules/dashboard/components/ContinueTrainingCard";
import { QuickClockCard }    from "@/modules/dashboard/components/QuickClockCard";
import { SkeletonCard } from "@/components/ui/Skeleton";

// Replaces the company-wide DashboardPage for the `operations` role —
// Operations' own booking-confirmation queue and package/supplier upkeep
// instead of company-wide sales/HR/payroll data unrelated to Ops' own work.
export function OperationsPersonalDashboard() {
  const { user } = useAuthStore();
  const currentEmployee   = useCurrentEmployee();
  const attendanceSummary = useAttendanceSummary();
  const ops = useOperationsActionStats();
  const relevantGoals = useRelevantCompanyGoals(currentEmployee.employee?.department ?? null, currentEmployee.employee?.id ?? null);

  return (
    <div className="space-y-6">

      <GreetingBanner
        newLeads={ops.pendingOpsApprovals}
        followUpCount={ops.pendingOpsApprovals}
      />

      <QuickClockCard />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Awaiting Confirmation"
          value={ops.pendingOpsApprovals}
          sub="Bookings needing Ops approval"
          href="/operations-approvals"
          featured
        />
        <StatCard
          label="Confirmed This Month"
          value={ops.confirmedThisMonth}
          sub="Bookings you've confirmed"
          href="/bookings"
        />
        <StatCard
          label="Active Packages"
          value={ops.activePackages}
          sub="Currently sellable"
          href="/packages"
        />
        <StatCard
          label="Active Suppliers"
          value={ops.activeSuppliers}
          sub="On file"
          href="/suppliers"
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

          <OpsApprovalQueueCard items={ops.oldestPending} loading={ops.loading} />

          <RelevantGoalsCard objectives={relevantGoals.objectives} loading={relevantGoals.loading} />

          <ContinueTrainingCard />

        </div>
      </div>

    </div>
  );
}
