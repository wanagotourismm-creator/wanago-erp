"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, RefreshCw, Upload } from "lucide-react";
import { useCampaigns } from "@/modules/campaigns/hooks/useCampaigns";
import { CampaignsTable } from "@/modules/campaigns/components/CampaignsTable";
import { CampaignForm } from "@/modules/campaigns/components/CampaignForm";
import { CampaignDetailModal } from "@/modules/campaigns/components/CampaignDetailModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import { BulkImportModal, type TemplateColumn } from "@/components/bulk/BulkImportModal";
import { BulkExportButton } from "@/components/bulk/BulkExportButton";
import { resolveOffice } from "@/lib/bulk/resolveOffice";
import { createCampaign } from "@/modules/campaigns/services/campaign.service";
import { campaignSchema } from "@/modules/campaigns/schemas";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import type { Office } from "@/modules/admin/offices/types";
import type { Campaign, CampaignFormData } from "@/modules/campaigns/types";
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
  const [importOpen,      setImportOpen]      = useState(false);
  const [offices,         setOffices]         = useState<Office[]>([]);

  useEffect(() => { fetchOffices().then(setOffices); }, []);

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

  const exportRows = useMemo(() => filtered.map((c) => ({
    Name:            c.name,
    Channel:         c.channel,
    "Campaign Type": c.campaignType,
    "Start Date":    c.startDate,
    "End Date":      c.endDate ?? "",
    Budget:          c.budget ?? "",
    Office:          c.officeName,
    Notes:           c.notes ?? "",
    Status:          c.campaignStatus,
  })), [filtered]);

  const templateColumns: TemplateColumn[] = [
    { key: "name", label: "Name", required: true, example: "Summer Getaway Promo" },
    { key: "channel", label: "Channel", required: true, example: "Instagram" },
    { key: "campaignType", label: "Campaign Type", example: "Social Media" },
    { key: "startDate", label: "Start Date", required: true, example: "2026-01-01" },
    { key: "endDate", label: "End Date", example: "2026-02-01" },
    { key: "budget", label: "Budget", example: "50000" },
    { key: "office", label: "Office", example: "Head Office" },
    { key: "notes", label: "Notes" },
    { key: "status", label: "Status", example: "draft" },
  ];

  function onParseRow(raw: Record<string, string>) {
    const office = resolveOffice(raw["Office"], offices, {
      officeId: user?.officeId ?? "",
      officeName: user?.officeName ?? "",
    });
    const candidate = {
      name: raw["Name"] ?? "",
      channel: raw["Channel"] ?? "",
      campaignType: raw["Campaign Type"] ?? "",
      startDate: raw["Start Date"] ?? "",
      endDate: raw["End Date"] ?? "",
      budget: raw["Budget"] || undefined,
      officeId: office.officeId,
      officeName: office.officeName,
      notes: raw["Notes"] ?? "",
      campaignStatus: (raw["Status"]?.trim() || "draft") as CampaignSchema["campaignStatus"],
    };
    const check = campaignSchema.safeParse(candidate);
    if (!check.success) return { error: check.error.issues[0]?.message ?? "Invalid row" };
    return { data: check.data };
  }

  async function onImport(rows: CampaignSchema[]) {
    let created = 0, failed = 0;
    for (const row of rows) {
      const payload: CampaignFormData = {
        ...row,
        endDate:      row.endDate      || null,
        budget:       row.budget       ?? null,
        notes:        row.notes        || null,
        campaignType: row.campaignType || "",
        createdBy:    user?.uid ?? "",
      };
      try {
        await createCampaign(payload, user?.uid ?? "");
        created++;
      } catch {
        failed++;
      }
    }
    return { created, failed };
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
        tourId="tour-campaigns-header"
        description={`${campaigns.length} total campaign${campaigns.length !== 1 ? "s" : ""} tracked`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setImportOpen(true)} data-tour-id="tour-campaigns-import">
              Import
            </Button>
            <BulkExportButton filenameBase="campaigns" rows={exportRows} />
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => { setEditingCampaign(null); setFormOpen(true); }}
              data-tour-id="tour-campaigns-add"
            >
              Add Campaign
            </Button>
          </>
        }
      />

      {/* Status filter tabs */}
      <div data-tour-id="tour-campaigns-filters" className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
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

      {/* Bulk import */}
      <BulkImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Campaigns"
        templateColumns={templateColumns}
        onParseRow={onParseRow}
        onImport={onImport}
      />

    </div>
  );
}
