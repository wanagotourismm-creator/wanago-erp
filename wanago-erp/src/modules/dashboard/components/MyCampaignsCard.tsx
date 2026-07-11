"use client";

import { Megaphone, TrendingDown } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/helpers";
import type { CampaignPerformance } from "@/modules/dashboard/hooks/useMyCampaignStats";

const STATUS_STYLES: Record<string, string> = {
  draft:     "bg-muted text-muted-foreground",
  active:    "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  paused:    "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  completed: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
};

export function MyCampaignsCard({ campaigns, loading }: { campaigns: CampaignPerformance[]; loading: boolean }) {
  // The lowest lead-generating *active* campaign is the one worth flagging
  // for attention — a paused/completed campaign generating few leads isn't
  // actionable the same way.
  const activeUnderperformer = [...campaigns]
    .filter((c) => c.campaign.campaignStatus === "active")
    .sort((a, b) => a.leadsGenerated - b.leadsGenerated)[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Megaphone size={16} className="text-primary" />
          <CardTitle>My Campaigns</CardTitle>
        </div>
      </CardHeader>

      {loading ? (
        <div className="h-16 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="Campaigns you create will show up here with their lead-generation performance"
          icon={<span className="text-2xl">📣</span>}
        />
      ) : (
        <div className="space-y-3">
          {activeUnderperformer && activeUnderperformer.leadsGenerated === 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
              <TrendingDown size={14} className="flex-shrink-0 mt-0.5" />
              <span><span className="font-medium">{activeUnderperformer.campaign.name}</span> hasn&apos;t generated any leads yet — consider reviewing its targeting or budget.</span>
            </div>
          )}
          {campaigns.map(({ campaign, leadsGenerated, won }) => (
            <div key={campaign.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{campaign.name}</p>
                  <p className="text-[11px] text-muted-foreground">{campaign.channel} · {campaign.campaignType}</p>
                </div>
                <span className={cn("flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_STYLES[campaign.campaignStatus])}>
                  {campaign.campaignStatus}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                <span><span className="font-semibold text-foreground">{leadsGenerated}</span> leads generated</span>
                <span><span className="font-semibold text-foreground">{won}</span> won</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
