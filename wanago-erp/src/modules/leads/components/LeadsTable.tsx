"use client";

import { Edit2, Pencil, Trash2, Phone, Mail } from "lucide-react";
import { PriorityBadge, StageBadge } from "@/modules/leads/components/LeadBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { PhoneLink } from "@/components/shared/PhoneLink";
import { SwipeableRow, type SwipeAction } from "@/components/shared/SwipeableRow";
import { formatDate, formatCurrency, initials } from "@/lib/utils/helpers";
import { LEAD_STAGE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils/helpers";
import type { Lead } from "@/modules/leads/types";

type Props = {
  leads:      Lead[];
  loading:    boolean;
  onView:     (lead: Lead) => void;
  onEdit:     (lead: Lead) => void;
  onDelete:   (lead: Lead) => void;
  onStage:    (lead: Lead, stage: string) => void;
};

export function LeadsTable({ leads, loading, onView, onEdit, onDelete, onStage }: Props) {
  if (loading) return <SkeletonTable rows={6} />;

  if (leads.length === 0) {
    return (
      <EmptyState
        title="No leads yet"
        description="Add your first lead to get started"
        icon={<span className="text-2xl">👤</span>}
      />
    );
  }

  return (
    <>
      {/* Desktop table — unchanged */}
      <div className="hidden sm:block overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Lead", "Contact", "Destination", "Stage", "Priority", "Source", "Date", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => onView(lead)}
                  className="cursor-pointer hover:bg-muted/20 transition-colors group"
                >

                  {/* Lead name + ref */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {initials(lead.name)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{lead.name}</p>
                        <p className="text-[11px] text-muted-foreground">{lead.refNumber}</p>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      <div className="text-xs text-foreground">
                        <PhoneLink phone={lead.phone} iconSize={11} />
                      </div>
                      {lead.email && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail size={11} />
                          {lead.email}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Destination */}
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{lead.destination}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {lead.pax ? `${lead.pax} pax` : "Pax TBD"} {lead.budget ? `· ${formatCurrency(lead.budget)}` : ""}
                      </p>
                    </div>
                  </td>

                  {/* Stage */}
                  <td className="px-4 py-3">
                    <select
                      value={lead.stage}
                      onChange={(e) => onStage(lead, e.target.value)}
                      className="rounded-lg border-0 bg-transparent p-0 text-xs font-medium focus:ring-0 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {Object.entries(LEAD_STAGE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-3">
                    <PriorityBadge priority={lead.priority} />
                  </td>

                  {/* Source */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">{lead.source}</span>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(lead.createdAt)}
                    </span>
                  </td>

                  {/* Actions — inline, same line, revealed on row hover */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                        title="Edit"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
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

      {/* Mobile card list — swipe left to reveal Call/Edit/Delete */}
      <div className="sm:hidden space-y-2.5">
        {leads.map((lead) => {
          const actions: SwipeAction[] = [
            ...(lead.phone ? [{
              key:       "call",
              icon:      <Phone size={16} />,
              label:     "Call",
              onClick:   () => { if (lead.phone) window.location.href = `tel:${lead.phone}`; },
              className: "bg-green-600",
            }] : []),
            {
              key:       "edit",
              icon:      <Pencil size={16} />,
              label:     "Edit",
              onClick:   () => onEdit(lead),
              className: "bg-blue-600",
            },
            {
              key:       "delete",
              icon:      <Trash2 size={16} />,
              label:     "Delete",
              onClick:   () => onDelete(lead),
              className: "bg-red-600",
            },
          ];

          return (
            <SwipeableRow
              key={lead.id}
              actions={actions}
              onTap={() => onView(lead)}
              className="rounded-xl border border-border"
            >
              <div className="rounded-xl bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(lead.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{lead.name}</p>
                      <p className="text-[11px] text-muted-foreground">{lead.refNumber}</p>
                    </div>
                  </div>
                  <PriorityBadge priority={lead.priority} />
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{lead.destination}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {lead.pax ? `${lead.pax} pax` : "Pax TBD"} {lead.budget ? `· ${formatCurrency(lead.budget)}` : ""}
                    </p>
                  </div>
                  <StageBadge stage={lead.stage} />
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                  <PhoneLink phone={lead.phone} iconSize={12} className="text-xs text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {formatDate(lead.createdAt)}
                  </span>
                </div>
              </div>
            </SwipeableRow>
          );
        })}
      </div>
    </>
  );
}
