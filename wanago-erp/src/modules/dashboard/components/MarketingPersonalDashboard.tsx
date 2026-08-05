"use client";

import { useAuthStore } from "@/store/auth.store";
import { useCurrentEmployee }   from "@/modules/dashboard/hooks/useCurrentEmployee";
import { useAttendanceSummary } from "@/modules/dashboard/hooks/useAttendanceSummary";
import { useMyCampaignStats }   from "@/modules/dashboard/hooks/useMyCampaignStats";
import { useRelevantCompanyGoals } from "@/modules/dashboard/hooks/useRelevantCompanyGoals";
import { GreetingBanner }    from "@/modules/dashboard/components/GreetingBanner";
import { StatCard }          from "@/modules/dashboard/components/StatCard";
import { ProfileHeroCard }   from "@/modules/dashboard/components/ProfileHeroCard";
import { AvgHoursWeekCard }  from "@/modules/dashboard/components/AvgHoursWeekCard";
import { OnsiteRemoteSplit } from "@/modules/dashboard/components/OnsiteRemoteSplit";
import { MyCampaignsCard }   from "@/modules/dashboard/components/MyCampaignsCard";
import { RelevantGoalsCard } from "@/modules/dashboard/components/RelevantGoalsCard";
import { ContinueTrainingCard } from "@/modules/dashboard/components/ContinueTrainingCard";
import { QuickClockCard }    from "@/modules/dashboard/components/QuickClockCard";
import { SkeletonCard } from "@/components/ui/Skeleton";

// Replaces the company-wide DashboardPage for the `marketing` role —
// scoped to campaigns this employee created instead of the whole
// company's leads/revenue/payroll.
export function MarketingPersonalDashboard() {
  const { user } = useAuthStore();
  const currentEmployee   = useCurrentEmployee();
  const attendanceSummary = useAttendanceSummary();
  const campaignStats = useMyCampaignStats(user?.uid ?? null);
  const relevantGoals = useRelevantCompanyGoals(currentEmployee.employee?.department ?? null, currentEmployee.employee?.id ?? null);

  return (
    <div className="space-y-6">

      <GreetingBanner
        newLeads={campaignStats.leadsThisMonth}
        followUpCount={campaignStats.activeCampaigns}
      />

      <QuickClockCard />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="My Campaigns"
          value={campaignStats.totalCampaigns}
          sub={`${campaignStats.activeCampaigns} active`}
          href="/campaigns"
          featured
        />
        <StatCard
          label="Leads Generated This Month"
          value={campaignStats.leadsThisMonth}
          sub="Across all my campaigns"
          href="/leads"
        />
        <StatCard
          label="Converted This Month"
          value={campaignStats.wonThisMonth}
          sub={`${campaignStats.conversionRate.toFixed(0)}% conversion`}
          href="/leads"
        />
        <StatCard
          label="Active Campaigns"
          value={campaignStats.activeCampaigns}
          sub="Currently running"
          href="/campaigns"
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

          <MyCampaignsCard campaigns={campaignStats.campaigns} loading={campaignStats.loading} />

          <RelevantGoalsCard objectives={relevantGoals.objectives} loading={relevantGoals.loading} />

          <ContinueTrainingCard />

        </div>
      </div>

    </div>
  );
}
