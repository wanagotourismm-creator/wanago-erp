"use client";

import { useState, useMemo } from "react";
import { Plus, Search, RefreshCw, Wallet, TrendingUp, Calendar } from "lucide-react";
import { usePayments } from "@/modules/payments/hooks/usePayments";
import { PaymentsTable } from "@/modules/payments/components/PaymentsTable";
import { PaymentDetailModal } from "@/modules/payments/components/PaymentDetailModal";
import { PaymentForm } from "@/modules/payments/components/PaymentForm";
import { formatAmount } from "@/modules/payments/components/PaymentBadges";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import type { Payment } from "@/modules/payments/types";
import type { PaymentSchema } from "@/modules/payments/schemas";

export function PaymentsPage() {
  const { payments, loading, addPayment, removePayment, load } = usePayments();
  const { user } = useAuthStore();
  const canCreate = !!user && hasPermission(user.systemRole, "finance:create");
  const canManage = !!user && hasPermission(user.systemRole, "finance:edit");

  const [formOpen,       setFormOpen]       = useState(false);
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);
  const [search,         setSearch]         = useState("");

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      return !search || [p.customerName, p.refNumber, p.invoiceRef ?? "", p.referenceNumber ?? ""]
        .some(f => f?.toLowerCase().includes(search.toLowerCase()));
    });
  }, [payments, search]);

  const stats = useMemo(() => {
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const now = new Date();
    const thisMonth = payments
      .filter(p => {
        const d = new Date(p.paymentDate);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, p) => sum + p.amount, 0);
    return { total: payments.length, totalCollected, thisMonth };
  }, [payments]);

  async function handleSubmit(data: PaymentSchema) {
    const payload = {
      ...data,
      invoiceId:       data.invoiceId       || null,
      invoiceRef:      data.invoiceRef      || null,
      referenceNumber: data.referenceNumber || null,
      notes:           data.notes           || null,
      createdBy:       user?.uid ?? "",
    };
    await addPayment(payload);
    setFormOpen(false);
  }

  async function handleDelete(payment: { id: string; refNumber: string }) {
    if (!confirm(`Delete payment "${payment.refNumber}"? This cannot be undone.`)) return;
    setViewingPayment(null);
    await removePayment(payment.id);
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Payments"
        description={`${payments.length} payment${payments.length !== 1 ? "s" : ""} recorded`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            {canCreate && (
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setFormOpen(true)}>
                Record Payment
              </Button>
            )}
          </>
        }
      />

      {/* Stat tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Payments",  value: stats.total,                          icon: Wallet,     color: "text-primary"    },
          { label: "Total Collected", value: formatAmount(stats.totalCollected),   icon: TrendingUp, color: "text-green-600"  },
          { label: "This Month",      value: formatAmount(stats.thisMonth),        icon: Calendar,   color: "text-blue-600"   },
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by customer, invoice, ref number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <PaymentsTable
        payments={filtered}
        loading={loading}
        canManage={canManage}
        onView={setViewingPayment}
        onDelete={handleDelete}
      />

      {/* Detail popup */}
      <PaymentDetailModal
        payment={viewingPayment ? filtered.find(p => p.id === viewingPayment.id) ?? viewingPayment : null}
        canManage={canManage}
        onClose={() => setViewingPayment(null)}
        onDelete={handleDelete}
      />

      {/* Form drawer */}
      <PaymentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

    </div>
  );
}
