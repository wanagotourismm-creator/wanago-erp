"use client";

import { useState, useMemo } from "react";
import { Plus, Search, RefreshCw } from "lucide-react";
import { useCampaigns } from "@/modules/campaigns/hooks/useCampaigns";
import { CampaignsTable } from "@/modules/campaigns/components/CampaignsTable";
import { CampaignForm } from "@/modules/campaigns/components/CampaignForm";
import { CampaignDetailModal } from "@/modules/campaigns/components/CampaignDetailModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import type { Campaign } from "@/modules/campaigns/types";
import type { CampaignSchema } from "@/modules/campaigns/schemas";

const STATUS_FILTERS: { value: Campaign["campaignStatus"] | ""; label: string }[] = [
  { value: "",          label: "All Campaigns" },
  { value: "draft",     label: "Draft"     },
  { value: "active",    label: "Active"    },
  { value: "paused",    label: "Paused"    },
  { value: "completed", label: "Completed" },
];

export function CampaignsPage() {
  const { campaigns, loading, addCampaign, editCampaign, removeCampaign, load } = useCampaigns();
  const { user } = useAuthStore();

  const [formOpen,        setFormOpen]        = useState(false);
  const [editingCampaign,  setEditingCampaign]  = useState<Campaign | null>(null);
  const [viewingCampaign,  setViewingCampaign]  = useState<Campaign | null>(null);
  const [statusFilter,    setStatusFilter]    = useState<Campaign["campaignStatus"] | "">("");
  const [search,          setSearch]          = useState("");

  // Filter campaigns
  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      const matchStatus = !statusFilter || c.campaignStatus === statusFilter;
      const matchSearch = !search || [c.name, c.channel, c.campaignType]
        .some(f => f?.toLowerCase().includes(search.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [campaigns, statusFilter, search]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    campaigns.forEach(c => { counts[c.campaignStatus] = (counts[c.campaignStatus] ?? 0) + 1; });
    return counts;
  }, [campaigns]);

  async function handleSubmit(data: CampaignSchema) {
    const payload = {
      ...data,
      endDate:      data.endDate      || null,
      budget:       data.budget       || null,
      notes:        data.notes        || null,
      campaignType: data.campaignType || "",
      createdBy:    user?.uid ?? "",
      status:       "active",
      refNumber:    editingCampaign?.refNumber ?? "",
    };

    if (editingCampaign) {
      await editCampaign(editingCampaign.id, payload);
    } else {
      await addCampaign(payload as never);
    }
    setFormOpen(false);
    setEditingCampaign(null);
  }

  function handleEdit(campaign: Campaign) {
    setViewingCampaign(null);
    setEditingCampaign(campaign);
    setFormOpen(true);
  }

  async function handleDelete(campaign: Campaign) {
    if (!confirm(`Delete campaign "${campaign.name}"? This cannot be undone.`)) return;
    setViewingCampaign(null);
    await removeCampaign(campaign.id);
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Campaigns"
        description={`${campaigns.length} total campaign${campaigns.length !== 1 ? "s" : ""} tracked`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => { setEditingCampaign(null); setFormOpen(true); }}
            >
              Add Campaign
            </Button>
          </>
        }
      />

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              "flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
              statusFilter === f.value
                ? "bg-primary text-white shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            )}
          >
            {f.label}
            {f.value && statusCounts[f.value] !== undefined && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                statusFilter === f.value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}>
                {statusCounts[f.value] ?? 0}
              </span>
            )}
            {!f.value && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                statusFilter === f.value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}>
                {campaigns.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name, channel, type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <CampaignsTable
        campaigns={filtered}
        loading={loading}
        onView={setViewingCampaign}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Detail popup */}
      <CampaignDetailModal
        campaign={viewingCampaign ? filtered.find(c => c.id === viewingCampaign.id) ?? viewingCampaign : null}
        onClose={() => setViewingCampaign(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Form drawer */}
      <CampaignForm
        open={formOpen}
        campaign={editingCampaign}
        onClose={() => { setFormOpen(false); setEditingCampaign(null); }}
        onSubmit={handleSubmit}
      />

    </div>
  );
}
