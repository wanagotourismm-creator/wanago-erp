"use client";

import { useState, useMemo } from "react";
import { Plus, Search, RefreshCw, FileText, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useInvoices } from "@/modules/invoices/hooks/useInvoices";
import { InvoicesTable } from "@/modules/invoices/components/InvoicesTable";
import { InvoiceDetailModal } from "@/modules/invoices/components/InvoiceDetailModal";
import { InvoiceForm } from "@/modules/invoices/components/InvoiceForm";
import { formatAmount } from "@/modules/invoices/components/InvoiceBadges";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils/helpers";
import { INVOICE_STATUS_LABELS } from "@/lib/constants";
import type { Invoice } from "@/modules/invoices/types";
import type { InvoiceSchema } from "@/modules/invoices/schemas";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  ...Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

export function InvoicesPage() {
  const { invoices, loading, addInvoice, editInvoice, sendInvoice, removeInvoice, load } = useInvoices();
  const { user } = useAuthStore();
  const canCreate = !!user && hasPermission(user.systemRole, "finance:create");
  const canManage = !!user && hasPermission(user.systemRole, "finance:edit");

  const [formOpen,        setFormOpen]        = useState(false);
  const [editingInvoice,  setEditingInvoice]  = useState<Invoice | null>(null);
  const [viewingInvoice,  setViewingInvoice]  = useState<Invoice | null>(null);
  const [statusFilter,    setStatusFilter]    = useState("");
  const [search,          setSearch]          = useState("");

  const filtered = useMemo(() => {
    return invoices.filter((i) => {
      const matchStatus = !statusFilter || i.status === statusFilter;
      const matchSearch = !search || [i.customerName, i.customerPhone, i.refNumber, i.bookingRef ?? ""]
        .some(f => f?.toLowerCase().includes(search.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [invoices, statusFilter, search]);

  const stats = useMemo(() => {
    const paid    = invoices.filter(i => i.status === "paid").length;
    const overdue = invoices.filter(i => i.status === "overdue").length;
    const dueAmount = invoices.reduce((sum, i) => sum + i.balanceDue, 0);
    return { total: invoices.length, paid, overdue, dueAmount };
  }, [invoices]);

  async function handleSubmit(data: InvoiceSchema) {
    const payload = {
      ...data,
      bookingId:  data.bookingId  || null,
      bookingRef: data.bookingRef || null,
      dueDate:    data.dueDate    || null,
      notes:      data.notes      || null,
      createdBy:  user?.uid ?? "",
    };

    if (editingInvoice) {
      await editInvoice(editingInvoice.id, payload);
    } else {
      await addInvoice(payload);
    }
    setFormOpen(false);
    setEditingInvoice(null);
  }

  function handleEdit(invoice: Invoice) {
    setViewingInvoice(null);
    setEditingInvoice(invoice);
    setFormOpen(true);
  }

  async function handleDelete(invoice: Invoice) {
    if (!confirm(`Delete invoice "${invoice.refNumber}"? This cannot be undone.`)) return;
    setViewingInvoice(null);
    await removeInvoice(invoice.id);
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Invoices"
        description={`${invoices.length} total invoice${invoices.length !== 1 ? "s" : ""}`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            {canCreate && (
              <Button
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => { setEditingInvoice(null); setFormOpen(true); }}
              >
                New Invoice
              </Button>
            )}
          </>
        }
      />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Invoices", value: stats.total,                   icon: FileText,      color: "text-primary"   },
          { label: "Paid",           value: stats.paid,                    icon: CheckCircle2,  color: "text-green-600" },
          { label: "Overdue",        value: stats.overdue,                 icon: AlertTriangle, color: "text-red-600"   },
          { label: "Amount Due",     value: formatAmount(stats.dueAmount), icon: Clock,         color: "text-amber-600" },
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

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              "flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
              statusFilter === f.value
                ? "bg-primary text-white shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by customer, phone, ref number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <InvoicesTable
        invoices={filtered}
        loading={loading}
        canManage={canManage}
        onView={setViewingInvoice}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Detail popup */}
      <InvoiceDetailModal
        invoice={viewingInvoice ? filtered.find(i => i.id === viewingInvoice.id) ?? viewingInvoice : null}
        canManage={canManage}
        onClose={() => setViewingInvoice(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSend={(invoice) => sendInvoice(invoice.id)}
      />

      {/* Form drawer */}
      <InvoiceForm
        open={formOpen}
        invoice={editingInvoice}
        onClose={() => { setFormOpen(false); setEditingInvoice(null); }}
        onSubmit={handleSubmit}
      />

    </div>
  );
}
