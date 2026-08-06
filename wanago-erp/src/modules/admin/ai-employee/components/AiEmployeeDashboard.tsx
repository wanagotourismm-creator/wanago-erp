"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Sparkles, GitPullRequest, CheckCircle2, AlertTriangle, Database, Zap, RefreshCw, Wrench, Inbox,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useTickets } from "@/modules/tickets/hooks/useTickets";
import { TicketDetailModal } from "@/modules/tickets/components/TicketDetailModal";
import { ResolveTicketModal } from "@/modules/tickets/components/ResolveTicketModal";
import { AiFixStatusBadge } from "@/modules/tickets/components/TicketBadges";
import { fetchTicketSlaPolicy, DEFAULT_TICKET_SLA_POLICY } from "@/modules/tickets/services/ticket-sla-policy.service";
import { useAiEmployeeDashboard } from "@/modules/admin/ai-employee/hooks/useAiEmployeeDashboard";
import { useAuthStore } from "@/store/auth.store";
import { toDate, timeAgo } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils/helpers";
import type { Timestamp } from "@/types/global";
import type { Ticket, TicketStatus } from "@/modules/tickets/types";

const STATUS_COLOR = { success: "#16a34a", error: "hsl(var(--destructive))" };

function displayStatus(t: Ticket): "pending_review" | "approved" | "rejected" | "needs_human" {
  return t.aiFixReviewStatus ?? "needs_human";
}

// aiDiagnosedAt's type includes FieldValue for the (never actually
// occurring, by the time this reads it back) serverTimestamp() write
// sentinel — toDate/timeAgo only accept resolved date-ish values, so this
// narrows the read-side type without changing runtime behavior.
function diagnosedAt(t: Ticket): Timestamp | Date | string | null | undefined {
  return t.aiDiagnosedAt as Timestamp | Date | string | null | undefined;
}

function byRecentDiagnosis(a: Ticket, b: Ticket): number {
  const da = toDate(diagnosedAt(a))?.getTime() ?? 0;
  const db_ = toDate(diagnosedAt(b))?.getTime() ?? 0;
  return db_ - da;
}

function StatTile({ icon: Icon, label, value, sub, tone }: {
  icon: React.ElementType; label: string; value: React.ReactNode; sub: string; tone?: "warn" | "ok";
}) {
  return (
    <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tone === "warn" ? "bg-amber-500/10" : "bg-primary/10")}>
          <Icon size={18} className={tone === "warn" ? "text-amber-600" : "text-primary"} />
        </div>
        <div>
          <p className={cn("text-2xl font-bold", tone === "warn" ? "text-amber-600" : "text-foreground")}>{value}</p>
          <p className="text-[11px] text-muted-foreground">{label} · {sub}</p>
        </div>
      </div>
    </div>
  );
}

// One page to see everything the AI Employee has done, not just per-ticket:
// usage volume/reliability, a queue of fixes waiting on a human, a full
// diagnosis history, and an audit trail of writes the chat assistant has
// actually made. Sits above AiEmployeePanel's settings form on the same tab.
export function AiEmployeeDashboard() {
  const { user } = useAuthStore();
  const canManageAiFix = user?.systemRole === "admin" || user?.systemRole === "super_admin";

  const { tickets, aiReviewBusy, load: reloadTickets, setStatus, resolveTicket, assignToMe, removeTicket, approveAiFix, rejectAiFix } = useTickets();
  const { loading, stats, featureBreakdown, recentErrors, recentActions, knowledgeCount, reload: reloadUsage } = useAiEmployeeDashboard();

  const [viewingTicket, setViewingTicket] = useState<Ticket | null>(null);
  const [resolvingTicket, setResolvingTicket] = useState<Ticket | null>(null);
  const [slaPolicy, setSlaPolicy] = useState(DEFAULT_TICKET_SLA_POLICY);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchTicketSlaPolicy().then(setSlaPolicy).catch(() => {}); }, []);

  const diagnosedTickets = useMemo(() => tickets.filter((t) => !!t.aiDiagnosis).sort(byRecentDiagnosis), [tickets]);
  const pendingTickets   = useMemo(() => diagnosedTickets.filter((t) => t.aiFixReviewStatus === "pending_review"), [diagnosedTickets]);
  const approvedCount    = useMemo(() => tickets.filter((t) => t.aiFixReviewStatus === "approved").length, [tickets]);

  async function handleRefresh() {
    setRefreshing(true);
    try { await Promise.all([reloadTickets(), reloadUsage()]); }
    finally { setRefreshing(false); }
  }

  function handleSetStatus(t: Ticket, status: TicketStatus) {
    if (status === "resolved" && t.ticketStatus !== "resolved") { setResolvingTicket(t); return; }
    setStatus(t.id, status);
  }

  function handleDelete(t: Ticket) {
    if (!confirm(`Delete ticket "${t.title}"?`)) return;
    setViewingTicket(null);
    removeTicket(t.id);
  }

  const chartHeight = Math.max(220, featureBreakdown.length * 42);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary">AI Employee Dashboard</h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors disabled:opacity-60"
        >
          <RefreshCw size={13} className={refreshing || loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile icon={Zap} label="AI Calls" value={stats.totalCalls} sub="last 30 days" />
        <StatTile icon={CheckCircle2} label="Success Rate" value={stats.successRate !== null ? `${stats.successRate}%` : "—"} sub="last 30 days" />
        <StatTile
          icon={Inbox} label="Pending Fixes" value={pendingTickets.length} sub="awaiting your review"
          tone={pendingTickets.length > 0 ? "warn" : undefined}
        />
        <StatTile icon={GitPullRequest} label="Draft PRs" value={approvedCount} sub="opened, all time" />
        <StatTile icon={Wrench} label="Actions Taken" value={stats.actionsTaken} sub="last 30 days" />
        <StatTile icon={Database} label="Knowledge Base" value={knowledgeCount ?? "—"} sub="resolved-ticket entries" />
      </div>

      {/* Pending AI Fixes queue */}
      <div className="fluid-card rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
          <Inbox size={14} className="text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Pending AI Fixes</p>
        </div>
        {pendingTickets.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-muted-foreground">Nothing waiting on review right now.</p>
        ) : (
          <div className="divide-y divide-border">
            {pendingTickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setViewingTicket(t)}
                className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {t.refNumber} · <code className="rounded bg-muted px-1 py-0.5">{t.aiProposedFix?.files.map((f) => f.targetFile).join(", ") || "—"}</code>
                  </p>
                </div>
                <span className="flex-shrink-0 text-[11px] text-muted-foreground">{timeAgo(diagnosedAt(t))}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Usage by feature */}
        <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">Usage by Feature</p>
          <p className="mb-3 text-[11px] text-muted-foreground">Last 30 days, success vs. error</p>
          {featureBreakdown.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">No AI activity in the last 30 days.</p>
          ) : (
            <div style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureBreakdown} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category" dataKey="feature" width={170}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }} />
                  <Bar dataKey="success" name="Success" stackId="a" fill={STATUS_COLOR.success} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="error" name="Error" stackId="a" fill={STATUS_COLOR.error} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent errors */}
        <div className="fluid-card rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
            <AlertTriangle size={14} className="text-destructive" />
            <p className="text-xs font-bold uppercase tracking-widest text-destructive">Recent Errors</p>
          </div>
          {recentErrors.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-muted-foreground">No AI errors recently.</p>
          ) : (
            <div className="max-h-80 divide-y divide-border overflow-y-auto scrollbar-thin">
              {recentErrors.map((e) => (
                <div key={e.id} className="px-5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">{e.feature}</span>
                    <span className="flex-shrink-0 text-[10px] text-muted-foreground">{timeAgo(e.createdAt)}</span>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">{e.errorMessage ?? "Unknown error"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Diagnosis history */}
        <div className="fluid-card rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
            <GitPullRequest size={14} className="text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Diagnosis History</p>
          </div>
          {diagnosedTickets.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-muted-foreground">No tickets diagnosed yet.</p>
          ) : (
            <div className="max-h-96 divide-y divide-border overflow-y-auto scrollbar-thin">
              {diagnosedTickets.slice(0, 25).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setViewingTicket(t)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">{t.title}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{t.refNumber} · {timeAgo(diagnosedAt(t))}</p>
                  </div>
                  <AiFixStatusBadge status={displayStatus(t)} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AI actions audit trail */}
        <div className="fluid-card rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
            <Wrench size={14} className="text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Recent AI Actions</p>
          </div>
          {recentActions.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-muted-foreground">No AI-proposed actions confirmed yet.</p>
          ) : (
            <div className="max-h-96 divide-y divide-border overflow-y-auto scrollbar-thin">
              {recentActions.map((a) => (
                <div key={a.id} className="px-5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">{a.tool}</span>
                    <span className={cn("text-[10px] font-semibold", a.outcome === "success" ? "text-green-600" : "text-destructive")}>
                      {a.outcome === "success" ? "Succeeded" : "Failed"}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">{a.argsSummary}</p>
                  <p className="text-[10px] text-muted-foreground/70">{timeAgo(a.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <TicketDetailModal
        ticket={viewingTicket ? tickets.find((t) => t.id === viewingTicket.id) ?? viewingTicket : null}
        canDelete={canManageAiFix}
        canManageAiFix={canManageAiFix}
        aiReviewBusy={aiReviewBusy}
        slaPolicy={slaPolicy}
        onClose={() => setViewingTicket(null)}
        onSetStatus={handleSetStatus}
        onAssignToMe={(t) => assignToMe(t.id)}
        onDelete={handleDelete}
        onApproveAiFix={(t) => approveAiFix(t.id)}
        onRejectAiFix={(t) => rejectAiFix(t.id)}
      />

      <ResolveTicketModal
        ticket={resolvingTicket}
        onClose={() => setResolvingTicket(null)}
        onConfirm={async (notes) => {
          if (!resolvingTicket) return { error: "No ticket selected" };
          const result = await resolveTicket(resolvingTicket.id, notes);
          if (!result.error) setResolvingTicket(null);
          return result;
        }}
      />
    </div>
  );
}
