"use client";

import { useState } from "react";
import { MoreHorizontal, Edit2, Trash2, Phone, Mail, Trophy } from "lucide-react";
import { StageBadge, PriorityBadge } from "@/modules/leads/components/LeadBadges";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate, initials } from "@/lib/utils/helpers";
import { LEAD_STAGE_LABELS, LEAD_STAGES } from "@/lib/constants";
import type { Lead } from "@/modules/leads/types";

type Props = {
  leads:    Lead[];
  loading:  boolean;
  onEdit:   (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onStage:  (lead: Lead, stage: string) => void;
};

export function LeadsTable({ leads, loading, onEdit, onDelete, onStage }: Props) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [wonToast, setWonToast] = useState<string | null>(null);

  function handleStageChange(lead: Lead, stage: string) {
    onStage(lead, stage);
    if (stage === LEAD_STAGES.WON) {
      setWonToast(lead.name);
      setTimeout(() => setWonToast(null), 4000);
    }
  }

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
      {/* Won toast notification */}
      {wonToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-green-600 px-5 py-3.5 text-white shadow-2xl animate-fade-in">
          <Trophy size={18} className="text-yellow-300" />
          <div>
            <p className="text-sm font-bold">🎉 Lead Won!</p>
            <p className="text-xs text-green-100">{wonToast} has been added to Customers automatically</p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Lead", "Contact", "Destination", "Stage", "Priority", "Source", "Date", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.map(lead => (
                <tr key={lead.id}
                  className={`hover:bg-muted/20 transition-colors group ${lead.stage === LEAD_STAGES.WON ? "bg-green-50/50 dark:bg-green-900/10" : ""}`}>

                  {/* Lead */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${lead.stage === LEAD_STAGES.WON ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-primary/10 text-primary"}`}>
                        {lead.stage === LEAD_STAGES.WON ? "🏆" : initials(lead.name)}
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
                      <div className="flex items-center gap-1 text-xs text-foreground">
                        <Phone size={11} className="text-muted-foreground" /> {lead.phone}
                      </div>
                      {lead.email && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail size={11} /> {lead.email}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Destination */}
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{lead.destination}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {lead.pax} pax {lead.budget ? `· ₹${lead.budget.toLocaleString()}` : ""}
                      </p>
                    </div>
                  </td>

                  {/* Stage */}
                  <td className="px-4 py-3">
                    <select
                      value={lead.stage}
                      onChange={e => handleStageChange(lead, e.target.value)}
                      className="rounded-lg border-0 bg-transparent p-0 text-xs font-medium focus:ring-0 cursor-pointer"
                      onClick={e => e.stopPropagation()}
                    >
                      {Object.entries(LEAD_STAGE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-3"><PriorityBadge priority={lead.priority} /></td>

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

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === lead.id ? null : lead.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <MoreHorizontal size={15} />
                      </button>
                      {menuOpen === lead.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-border bg-card shadow-lg py-1">
                            <button onClick={() => { onEdit(lead); setMenuOpen(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                              <Edit2 size={13} /> Edit
                            </button>
                            <button onClick={() => { onDelete(lead); setMenuOpen(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
