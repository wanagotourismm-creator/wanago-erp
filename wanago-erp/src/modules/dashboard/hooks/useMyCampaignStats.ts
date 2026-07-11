"use client";

import { useEffect, useState } from "react";
import { fetchCampaigns } from "@/modules/campaigns/services/campaign.service";
import { fetchLeads } from "@/modules/leads/services/lead.service";
import { toDate } from "@/lib/utils/helpers";
import { LEAD_STAGES } from "@/lib/constants";
import type { Campaign } from "@/modules/campaigns/types";

export type CampaignPerformance = { campaign: Campaign; leadsGenerated: number; won: number };

export type MyCampaignStats = {
  totalCampaigns: number;
  activeCampaigns: number;
  leadsThisMonth: number;
  wonThisMonth: number;
  conversionRate: number;
  campaigns: CampaignPerformance[]; // sorted by leadsGenerated desc
};

const EMPTY: MyCampaignStats = {
  totalCampaigns: 0, activeCampaigns: 0, leadsThisMonth: 0, wonThisMonth: 0, conversionRate: 0, campaigns: [],
};

// Scoped to campaigns this marketing employee created (there's no
// per-campaign "assignedTo," so authorship is the closest available
// notion of personal ownership). A lead is attributed to a campaign the
// same way campaign.service.ts's countLeadsForCampaign already does —
// matching lead.source to campaign.channel within the campaign's date
// range — since leads don't carry a direct campaignId either.
export function useMyCampaignStats(userId: string | null) {
  const [stats, setStats] = useState<MyCampaignStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
        const [allCampaigns, allLeads] = await Promise.all([fetchCampaigns(), fetchLeads()]);
        if (cancelled) return;

        const myCampaigns = allCampaigns.filter((c) => c.createdBy === userId);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const performance: CampaignPerformance[] = myCampaigns.map((campaign) => {
          const start = toDate(campaign.startDate);
          const end = campaign.endDate ? toDate(campaign.endDate) : null;
          const attributed = allLeads.filter((l) => {
            if (l.source !== campaign.channel) return false;
            const created = toDate(l.createdAt);
            if (!created || !start || created < start) return false;
            if (end && created > end) return false;
            return true;
          });
          return {
            campaign,
            leadsGenerated: attributed.length,
            won: attributed.filter((l) => l.stage === LEAD_STAGES.WON).length,
          };
        }).sort((a, b) => b.leadsGenerated - a.leadsGenerated);

        let leadsThisMonth = 0;
        let wonThisMonth = 0;
        for (const { campaign } of performance) {
          const start = toDate(campaign.startDate);
          const end = campaign.endDate ? toDate(campaign.endDate) : null;
          const attributedThisMonth = allLeads.filter((l) => {
            if (l.source !== campaign.channel) return false;
            const created = toDate(l.createdAt);
            if (!created || !start || created < start || created < monthStart) return false;
            if (end && created > end) return false;
            return true;
          });
          leadsThisMonth += attributedThisMonth.length;
          wonThisMonth += attributedThisMonth.filter((l) => l.stage === LEAD_STAGES.WON).length;
        }

        setStats({
          totalCampaigns: myCampaigns.length,
          activeCampaigns: myCampaigns.filter((c) => c.campaignStatus === "active").length,
          leadsThisMonth,
          wonThisMonth,
          conversionRate: leadsThisMonth > 0 ? (wonThisMonth / leadsThisMonth) * 100 : 0,
          campaigns: performance,
        });
      } catch (e) {
        console.error("[useMyCampaignStats] failed to load — showing zeroed stats:", e);
        if (!cancelled) setStats(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  return { ...stats, loading };
}
