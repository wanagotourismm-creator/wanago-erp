"use client";

import { useAuthStore } from "@/store/auth.store";
import { useCurrentEmployee }   from "@/modules/dashboard/hooks/useCurrentEmployee";
import { useAttendanceSummary } from "@/modules/dashboard/hooks/useAttendanceSummary";
import { useFinanceActionStats } from "@/modules/dashboard/hooks/useFinanceActionStats";
import { useRelevantCompanyGoals } from "@/modules/dashboard/hooks/useRelevantCompanyGoals";
import { GreetingBanner }    from "@/modules/dashboard/components/GreetingBanner";
import { StatCard }          from "@/modules/dashboard/components/StatCard";
import { ProfileHeroCard }   from "@/modules/dashboard/components/ProfileHeroCard";
import { AvgHoursWeekCard }  from "@/modules/dashboard/components/AvgHoursWeekCard";
import { OnsiteRemoteSplit } from "@/modules/dashboard/components/OnsiteRemoteSplit";
import { FinanceActionQueueCard } from "@/modules/dashboard/components/FinanceActionQueueCard";
import { RelevantGoalsCard } from "@/modules/dashboard/components/RelevantGoalsCard";
import { ContinueTrainingCard } from "@/modules/dashboard/components/ContinueTrainingCard";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/utils/helpers";

// Replaces the company-wide DashboardPage for the `finance` role —
// Finance's own approval queues and collections instead of company-wide
// sales/HR/payroll data unrelated to Finance's own work.
export function FinancePersonalDashboard() {
  const { user } = useAuthStore();
  const currentEmployee   = useCurrentEmployee();
  const attendanceSummary = useAttendanceSummary();
  const finance = useFinanceActionStats();
  const relevantGoals = useRelevantCompanyGoals(currentEmployee.employee?.department ?? null, currentEmployee.employee?.id ?? null);

  return (
    <div className="space-y-6">

      <GreetingBanner
        newLeads={finance.pendingInvoiceApprovals}
        followUpCount={finance.pendingExpenseApprovals}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Collected This Month"
          value={formatCurrency(finance.collectedThisMonth)}
          sub="Payments recorded"
          href="/payments"
          featured
        />
        <StatCard
          label="Pending Invoice Approvals"
          value={finance.pendingInvoiceApprovals}
          sub="Awaiting Finance sign-off"
          href="/invoices"
        />
        <StatCard
          label="Overdue Invoices"
          value={finance.overdueInvoices}
          sub={formatCurrency(finance.overdueAmount) + " outstanding"}
          href="/invoices"
        />
        <StatCard
          label="Pending Expense Approvals"
          value={finance.pendingExpenseApprovals}
          sub="Awaiting review"
          href="/expenses"
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

          <FinanceActionQueueCard items={finance.oldestPending} loading={finance.loading} />

          <RelevantGoalsCard objectives={relevantGoals.objectives} loading={relevantGoals.loading} />

          <ContinueTrainingCard />

        </div>
      </div>

    </div>
  );
}
