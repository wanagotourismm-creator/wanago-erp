"use client";

import { useEffect, useState } from "react";
import { X, Edit2, Trash2, Megaphone, Calendar, Users, StickyNote } from "lucide-react";
import { CampaignStatusBadge } from "@/modules/campaigns/components/CampaignsTable";
import { countLeadsForCampaign } from "@/modules/campaigns/services/campaign.service";
import { formatDate } from "@/lib/utils/helpers";
import type { Campaign } from "@/modules/campaigns/types";

type Props = {
  campaign: Campaign | null;
  onClose:  () => void;
  onEdit:   (campaign: Campaign) => void;
  onDelete: (campaign: Campaign) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function CampaignDetailModal({ campaign, onClose, onEdit, onDelete }: Props) {
  const [leadsGenerated, setLeadsGenerated] = useState<number | null>(null);
  const [statsLoading,   setStatsLoading]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (campaign) {
      setLeadsGenerated(null);
      setStatsLoading(true);
      countLeadsForCampaign(campaign)
        .then((count) => { if (!cancelled) setLeadsGenerated(count); })
        .finally(() => { if (!cancelled) setStatsLoading(false); });
    }
    return () => { cancelled = true; };
  }, [campaign]);

  if (!campaign) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Megaphone size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{campaign.name}</h2>
              <p className="text-xs text-muted-foreground">{campaign.refNumber} · Added {formatDate(campaign.createdAt)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">

          <div className="flex flex-wrap items-center gap-2">
            <CampaignStatusBadge status={campaign.campaignStatus} />
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {campaign.channel}
            </span>
            {campaign.campaignType && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {campaign.campaignType}
              </span>
            )}
          </div>

          {/* Leads Generated stat */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users size={16} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Leads Generated</p>
              <p className="text-lg font-bold text-foreground">
                {statsLoading ? "—" : leadsGenerated ?? "—"}
              </p>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Calendar size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Schedule &amp; Budget</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Start Date" value={formatDate(campaign.startDate)} />
              <Row label="End Date" value={campaign.endDate ? formatDate(campaign.endDate) : "Ongoing"} />
              <Row label="Budget" value={campaign.budget ? `₹${campaign.budget.toLocaleString()}` : null} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Megaphone size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Office</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Office" value={campaign.officeName} />
            </div>
          </div>

          {campaign.notes && (
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <StickyNote size={13} className="text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Notes</p>
              </div>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {campaign.notes}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-primary/15 bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(campaign)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
            >
              <Edit2 size={13} /> Edit
            </button>
            <button
              onClick={() => onDelete(campaign)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
