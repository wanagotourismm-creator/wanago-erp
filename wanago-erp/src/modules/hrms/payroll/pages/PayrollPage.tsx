"use client";

import { useState, useMemo } from "react";
import { Plus, RefreshCw, Wallet, FileClock, CheckCircle2, Banknote } from "lucide-react";
import { usePayroll } from "@/modules/hrms/payroll/hooks/usePayroll";
import { PayrollTable } from "@/modules/hrms/payroll/components/PayrollTable";
import { PayrollForm } from "@/modules/hrms/payroll/components/PayrollForm";
import { PayrollDetailModal } from "@/modules/hrms/payroll/components/PayrollDetailModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import { cn, formatCurrency } from "@/lib/utils/helpers";
import type { PayrollRecord } from "@/modules/hrms/shared/types";
import type { PayrollRecordSchema } from "@/modules/hrms/payroll/schemas";

const STATUS_FILTERS = ["All", "Draft", "Processed", "Paid"];

export function PayrollPage() {
  const { records, loading, stats, generatePayroll, editPayroll, processPayroll, payPayroll, removePayroll, load } = usePayroll();
  const { user } = useAuthStore();
  const canManage = !!user && hasPermission(user.systemRole, "hrms:manage");

  const [formOpen, setFormOpen] = useState(false);
  const [editing,  setEditing]  = useState<PayrollRecord | null>(null);
  const [viewing,  setViewing]  = useState<PayrollRecord | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = useMemo(() => records.filter(r =>
    statusFilter === "All" || r.payrollStatus === statusFilter.toLowerCase()
  ), [records, statusFilter]);

  async function handleSubmit(data: PayrollRecordSchema) {
    setFormError(null);
    const result = editing ? await editPayroll(editing.id, data) : await generatePayroll(data);
    if (result.error) { setFormError(result.error); return; }
    setFormOpen(false); setEditing(null);
  }

  function handleEdit(r: PayrollRecord) {
    setViewing(null);
    setEditing(r);
    setFormError(null);
    setFormOpen(true);
  }

  async function handleDelete(r: PayrollRecord) {
    if (!confirm(`Delete payroll record for "${r.employeeName}"?`)) return;
    setViewing(null);
    await removePayroll(r.id);
  }

  async function handleProcess(r: PayrollRecord) {
    await processPayroll(r.id);
  }

  async function handlePay(r: PayrollRecord) {
    await payPayroll(r.id);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Payroll" description={`${records.length} total payroll records`}
        actions={<>
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={load}>Refresh</Button>
          {canManage && <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditing(null); setFormError(null); setFormOpen(true); }}>Generate Payroll</Button>}
        </>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Records",  value: stats.total,     icon: Wallet,      color: "text-primary"   },
          { label: "Draft",          value: stats.draft,     icon: FileClock,   color: "text-gray-500"  },
          { label: "Processed",      value: stats.processed, icon: CheckCircle2, color: "text-amber-600" },
          { label: "Paid Out",       value: formatCurrency(stats.totalPayout), icon: Banknote, color: "text-green-600" },
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

      <PayrollTable records={filtered} loading={loading} canManage={canManage}
        onView={setViewing}
        onEdit={handleEdit}
        onProcess={handleProcess}
        onPay={handlePay}
        onDelete={handleDelete} />

      <PayrollDetailModal
        record={viewing ? filtered.find(r => r.id === viewing.id) ?? viewing : null}
        canManage={canManage}
        onClose={() => setViewing(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onProcess={handleProcess}
        onPay={handlePay}
      />

      <PayrollForm open={formOpen} record={editing} error={formError}
        onClose={() => { setFormOpen(false); setEditing(null); setFormError(null); }}
        onSubmit={handleSubmit} />
    </div>
  );
}
