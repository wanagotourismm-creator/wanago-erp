"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchCampaigns, createCampaign, updateCampaign, deleteCampaign,
} from "@/modules/campaigns/services/campaign.service";
import { useAuthStore } from "@/store/auth.store";
import { logActivity } from "@/lib/activity-log";
import type { Campaign, CampaignFormData } from "@/modules/campaigns/types";

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const { user } = useAuthStore();

  const load = useCallback(async (filters?: { campaignStatus?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCampaigns(filters);
      setCampaigns(data);
    } catch (e) {
      setError("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addCampaign(data: CampaignFormData): Promise<{ error: string | null }> {
    try {
      const campaign = await createCampaign(data, user?.uid ?? "");
      setCampaigns(prev => [campaign, ...prev]);
      logActivity({
        entityType: "Campaign", entityName: campaign.name, action: "created",
        detail: `Added campaign ${campaign.refNumber} (${campaign.channel})`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to create campaign" };
    }
  }

  async function editCampaign(
    id: string, data: Partial<CampaignFormData>
  ): Promise<{ error: string | null }> {
    try {
      await updateCampaign(id, data);
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
      return { error: null };
    } catch {
      return { error: "Failed to update campaign" };
    }
  }

  async function removeCampaign(id: string): Promise<{ error: string | null }> {
    try {
      const campaign = campaigns.find(c => c.id === id);
      await deleteCampaign(id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
      if (campaign) {
        logActivity({
          entityType: "Campaign", entityName: campaign.name, action: "deleted",
          detail: `Deleted campaign ${campaign.refNumber}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete campaign" };
    }
  }

  return { campaigns, loading, error, load, addCampaign, editCampaign, removeCampaign };
}
