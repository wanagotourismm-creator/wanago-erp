"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import { LEAD_STAGE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils/helpers";

export type AgentLeadStats = {
  agentId:        string; // "" for unassigned
  agentName:      string;
  total:          number;
  byStage:        Record<string, number>;
  won:            number;
  conversionRate: number; // won / total * 100
};

type Props = {
  stats:         AgentLeadStats[];
  activeAgentId: string;
  onSelectAgent: (agentId: string) => void;
};

const STAGE_ORDER = ["new", "contacted", "follow_up", "quoted", "negotiation", "won", "lost"] as const;

// Admin/ops-only breakdown of the leads pipeline by assigned agent — counts
// per stage plus a win rate, so an admin can spot who's sitting on a pile of
// uncontacted leads or who's actually converting, without opening the
// heavier Sales Performance Hub (which is month-bucketed and pulls in
// bookings/incentives/HR goals — overkill for a quick per-agent lead check).
// Clicking a row doubles as the agent filter for the table above.
export function AgentBreakdownPanel({ stats, activeAgentId, onSelectAgent }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users size={14} className="text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Agent Performance</p>
        </div>
        {collapsed ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronUp size={14} className="text-muted-foreground" />}
      </button>

      {!collapsed && (
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Agent", "Total", ...STAGE_ORDER.map((s) => LEAD_STAGE_LABELS[s]), "Win Rate"].map((h) => (
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
                  key={s.agentId || "unassigned"}
                  onClick={() => onSelectAgent(activeAgentId === s.agentId ? "" : s.agentId)}
                  className={cn(
                    "cursor-pointer hover:bg-muted/20 transition-colors",
                    activeAgentId === s.agentId && "bg-primary/5"
                  )}
                >
                  <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">
                    {s.agentName}
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
