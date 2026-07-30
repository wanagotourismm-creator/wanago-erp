"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, type LucideIcon } from "lucide-react";
import { LEAD_STAGE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils/helpers";

export type LeadGroupStats = {
  id:             string; // "" / a sentinel for the fallback bucket (Unassigned agent, Unknown source, ...)
  name:           string;
  total:          number;
  byStage:        Record<string, number>;
  won:            number;
  conversionRate: number; // won / total * 100
};

type Props = {
  title:      string;
  icon:       LucideIcon;
  groupLabel: string; // column header for the grouping dimension — "Agent", "Source", ...
  stats:      LeadGroupStats[];
  activeId:   string;
  onSelectId: (id: string) => void;
};

const STAGE_ORDER = ["new", "contacted", "follow_up", "quoted", "negotiation", "won", "lost"] as const;

// Generic admin/ops-only breakdown of the leads pipeline by whatever
// dimension the caller groups by (assigned agent, lead source, ...) — counts
// per stage plus a win rate, without the weight of the Sales Performance Hub
// (month-bucketed, pulls in bookings/incentives/HR goals — overkill for a
// quick pipeline check). Clicking a row doubles as a filter for the table
// above; sorting/grouping is entirely the caller's responsibility, this
// just renders whatever order `stats` is already in.
export function LeadBreakdownPanel({ title, icon: Icon, groupLabel, stats, activeId, onSelectId }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-primary">{title}</p>
        </div>
        {collapsed ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronUp size={14} className="text-muted-foreground" />}
      </button>

      {!collapsed && (
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {[groupLabel, "Total", ...STAGE_ORDER.map((s) => LEAD_STAGE_LABELS[s]), "Win Rate"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.length === 0 && (
                <tr><td colSpan={STAGE_ORDER.length + 3} className="px-4 py-6 text-center text-xs text-muted-foreground">No leads yet</td></tr>
              )}
              {stats.map((s) => (
                <tr
                  key={s.id || "none"}
                  onClick={() => onSelectId(activeId === s.id ? "" : s.id)}
                  className={cn(
                    "cursor-pointer hover:bg-muted/20 transition-colors",
                    activeId === s.id && "bg-primary/5"
                  )}
                >
                  <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">
                    {s.name}
                  </td>
                  <td className="px-4 py-2.5 text-foreground">{s.total}</td>
                  {STAGE_ORDER.map((stage) => (
                    <td key={stage} className="px-4 py-2.5 text-muted-foreground">
                      {s.byStage[stage] ?? 0}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">
                    {s.conversionRate.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
