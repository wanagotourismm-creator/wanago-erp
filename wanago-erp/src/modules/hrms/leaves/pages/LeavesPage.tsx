"use client";

import { useState, useMemo } from "react";
import { Plus, RefreshCw, CalendarDays, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useLeaves } from "@/modules/hrms/leaves/hooks/useLeaves";
import { LeaveTable } from "@/modules/hrms/leaves/components/LeaveTable";
import { LeaveForm } from "@/modules/hrms/leaves/components/LeaveForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils/helpers";
import type { LeaveRequest } from "@/modules/hrms/shared/types";
import type { LeaveRequestSchema } from "@/modules/hrms/leaves/schemas";

const STATUS_FILTERS = ["All", "Pending", "Approved", "Rejected", "Cancelled"];

export function LeavesPage() {
  const { leaves, loading, stats, addLeave, editLeave, approveLeave, rejectLeave, removeLeave, load } = useLeaves();
  const { user } = useAuthStore();
  const canDecide = !!user && hasPermission(user.systemRole, "hrms:manage");

  const [formOpen, setFormOpen] = useState(false);
  const [editing,  setEditing]  = useState<LeaveRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = useMemo(() => leaves.filter(l =>
    statusFilter === "All" || l.status === statusFilter.toLowerCase()
  ), [leaves, statusFilter]);

  async function handleSubmit(data: LeaveRequestSchema) {
    if (editing) await editLeave(editing.id, data);
    else await addLeave(data);
    setFormOpen(false); setEditing(null);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Leave Management" description={`${leaves.length} total leave requests`}
        actions={<>
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={load}>Refresh</Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditing(null); setFormOpen(true); }}>New Request</Button>
        </>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Requests", value: stats.total,    icon: CalendarDays, color: "text-primary"     },
          { label: "Pending",        value: stats.pending,  icon: Clock,        color: "text-amber-600"   },
          { label: "Approved",       value: stats.approved, icon: CheckCircle2, color: "text-green-600"   },
          { label: "Rejected",       value: stats.rejected, icon: XCircle,      color: "text-red-600"     },
        ].map(s => (
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

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn("flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
              statusFilter === s ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40")}>
            {s}
          </button>
        ))}
      </div>

      <LeaveTable leaves={filtered} loading={loading} canDecide={canDecide}
        onEdit={l => { setEditing(l); setFormOpen(true); }}
        onApprove={async l => { await approveLeave(l.id); }}
        onReject={async l => { await rejectLeave(l.id); }}
        onDelete={async l => { if (confirm(`Delete leave request for "${l.employeeName}"?`)) await removeLeave(l.id); }} />

      <LeaveForm open={formOpen} leave={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit} />
    </div>
  );
}
