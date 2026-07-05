"use client";

import { useMemo, useState } from "react";
import { Ticket as TicketIcon, RefreshCw, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useTickets } from "@/modules/tickets/hooks/useTickets";
import { TicketsTable } from "@/modules/tickets/components/TicketsTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/helpers";

const STATUS_FILTERS = ["All", "Open", "In Progress", "Resolved", "Closed"];

export function TicketsPanel() {
  const { tickets, loading, stats, load, setStatus, assignToMe, removeTicket } = useTickets();
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = useMemo(() => tickets.filter((t) => {
    if (statusFilter === "All") return true;
    return t.ticketStatus === statusFilter.toLowerCase().replace(" ", "_");
  }), [tickets, statusFilter]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tickets) counts[t.category] = (counts[t.category] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [tickets]);

  return (
    <div className="space-y-5">
      <PageHeader title="IT Support" description={`${stats.total} tickets reported`}
        actions={<Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={load}>Refresh</Button>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Open", value: stats.open, icon: AlertCircle, color: "text-blue-600" },
          { label: "In Progress", value: stats.inProgress, icon: Clock, color: "text-amber-600" },
          { label: "Resolved / Closed", value: stats.resolved, icon: CheckCircle2, color: "text-green-600" },
          { label: "Total", value: stats.total, icon: TicketIcon, color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <s.icon size={18} className="text-primary" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {categoryCounts.length > 0 && (
        <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-foreground mb-3">By Category</p>
          <div className="flex flex-wrap gap-2">
            {categoryCounts.map(([category, count]) => (
              <span key={category} className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground">
                {category} <span className="text-primary font-bold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {STATUS_FILTERS.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn("flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
              statusFilter === s ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40")}>
            {s}
          </button>
        ))}
      </div>

      <TicketsTable
        tickets={filtered}
        loading={loading}
        onSetStatus={(t, status) => setStatus(t.id, status)}
        onAssignToMe={(t) => assignToMe(t.id)}
        onDelete={(t) => { if (confirm(`Delete ticket "${t.title}"?`)) removeTicket(t.id); }}
      />
    </div>
  );
}
