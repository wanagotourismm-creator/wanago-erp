"use client";

import { Edit2, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate, cn } from "@/lib/utils/helpers";
import type { Campaign } from "@/modules/campaigns/types";

type Props = {
  campaigns: Campaign[];
  loading:   boolean;
  onView:    (campaign: Campaign) => void;
  onEdit:    (campaign: Campaign) => void;
  onDelete:  (campaign: Campaign) => void;
};

const STATUS_STYLES: Record<Campaign["campaignStatus"], string> = {
  draft:     "bg-muted text-muted-foreground",
  active:    "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  paused:    "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  completed: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
};

const STATUS_LABELS: Record<Campaign["campaignStatus"], string> = {
  draft:     "Draft",
  active:    "Active",
  paused:    "Paused",
  completed: "Completed",
};

export function CampaignStatusBadge({ status }: { status: Campaign["campaignStatus"] }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      STATUS_STYLES[status]
    )}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function CampaignsTable({ campaigns, loading, onView, onEdit, onDelete }: Props) {
  if (loading) return <SkeletonTable rows={6} />;

  if (campaigns.length === 0) {
    return (
      <EmptyState
        title="No campaigns yet"
        description="Add your first marketing campaign to get started"
        icon={<span className="text-2xl">📣</span>}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Name", "Channel", "Type", "Start/End Date", "Budget", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {campaigns.map((campaign) => (
              <tr
                key={campaign.id}
                onClick={() => onView(campaign)}
                className="cursor-pointer hover:bg-muted/20 transition-colors group"
              >

                {/* Name + ref */}
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{campaign.name}</p>
                    <p className="text-[11px] text-muted-foreground">{campaign.refNumber}</p>
                  </div>
                </td>

                {/* Channel */}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{campaign.channel}</span>
                </td>

                {/* Type */}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{campaign.campaignType || "—"}</span>
                </td>

                {/* Start/End Date */}
                <td className="px-4 py-3">
                  <span className="text-xs text-foreground whitespace-nowrap">
                    {formatDate(campaign.startDate)} – {campaign.endDate ? formatDate(campaign.endDate) : "Ongoing"}
                  </span>
                </td>

                {/* Budget */}
                <td className="px-4 py-3">
                  <span className="text-xs text-foreground whitespace-nowrap">
                    {campaign.budget ? `₹${campaign.budget.toLocaleString()}` : "—"}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <CampaignStatusBadge status={campaign.campaignStatus} />
                </td>

                {/* Actions — inline, same line, revealed on row hover */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(campaign); }}
                      title="Edit"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(campaign); }}
                      title="Delete"
                      className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors")}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
