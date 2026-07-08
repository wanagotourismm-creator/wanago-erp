"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, RefreshCw, Wallet, TrendingUp, Calendar, Upload } from "lucide-react";
import { usePayments } from "@/modules/payments/hooks/usePayments";
import { PaymentsTable } from "@/modules/payments/components/PaymentsTable";
import { PaymentDetailModal } from "@/modules/payments/components/PaymentDetailModal";
import { PaymentForm } from "@/modules/payments/components/PaymentForm";
import { formatAmount } from "@/modules/payments/components/PaymentBadges";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import { BulkImportModal, type TemplateColumn } from "@/components/bulk/BulkImportModal";
import { BulkExportButton } from "@/components/bulk/BulkExportButton";
import { resolveOffice } from "@/lib/bulk/resolveOffice";
import { createPayment } from "@/modules/payments/services/payment.service";
import { paymentSchema } from "@/modules/payments/schemas";
import { fetchCustomers } from "@/modules/customers/services/customer.service";
import { fetchInvoices } from "@/modules/invoices/services/invoice.service";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import type { Office } from "@/modules/admin/offices/types";
import type { Customer } from "@/modules/customers/types";
import type { Invoice } from "@/modules/invoices/types";
import type { Payment, PaymentFormData } from "@/modules/payments/types";
import type { PaymentSchema } from "@/modules/payments/schemas";

export function PaymentsPage() {
  const { payments, loading, addPayment, removePayment, load } = usePayments();
  const { user } = useAuthStore();
  const canCreate = !!user && hasPermission(user.systemRole, "finance:create");
  const canManage = !!user && hasPermission(user.systemRole, "finance:edit");

  const [formOpen,       setFormOpen]       = useState(false);
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);
  const [search,         setSearch]         = useState("");
  const [importOpen,     setImportOpen]     = useState(false);
  const [offices,        setOffices]        = useState<Office[]>([]);
  const [customers,      setCustomers]      = useState<Customer[]>([]);
  const [invoices,       setInvoices]       = useState<Invoice[]>([]);

  useEffect(() => {
    fetchOffices().then(setOffices).catch(() => {});
    fetchCustomers().then(setCustomers).catch(() => {});
    fetchInvoices().then(setInvoices).catch(() => {});
  }, []);

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

  const exportRows = useMemo(() => filtered.map((p) => ({
    "Invoice Ref":     p.invoiceRef ?? "",
    "Customer Phone":  customers.find(c => c.id === p.customerId)?.phone ?? "",
    "Customer Name":   p.customerName,
    Amount:            p.amount,
    "Payment Method":  p.paymentMethod,
    "Payment Date":    p.paymentDate,
    "Reference No.":   p.referenceNumber ?? "",
    Office:            p.officeName,
    Notes:             p.notes ?? "",
  })), [filtered, customers]);

  const templateColumns: TemplateColumn[] = [
    { key: "invoiceRef", label: "Invoice Ref", example: "INV-0001" },
    { key: "customerPhone", label: "Customer Phone", required: true, example: "9876543210" },
    { key: "amount", label: "Amount", required: true, example: "50000" },
    { key: "paymentMethod", label: "Payment Method", required: true, example: "Cash" },
    { key: "paymentDate", label: "Payment Date", required: true, example: "2026-01-01" },
    { key: "referenceNumber", label: "Reference No.", example: "UTR12345" },
    { key: "office", label: "Office", example: "Head Office" },
    { key: "notes", label: "Notes" },
  ];

  // Customer match is required (by phone); Invoice match is optional (by ref
  // number) — an unmatched/blank invoice ref just leaves the payment
  // standalone, same as picking "No invoice" in the manual form.
  function onParseRow(raw: Record<string, string>) {
    const office = resolveOffice(raw["Office"], offices, {
      officeId: user?.officeId ?? "",
      officeName: user?.officeName ?? "",
    });

    const phone = raw["Customer Phone"]?.trim();
    const customer = customers.find(c => c.phone === phone);
    if (!customer) return { error: `No customer found with phone "${phone ?? ""}"` };

    const invoiceRefRaw = raw["Invoice Ref"]?.trim();
    const invoice = invoiceRefRaw
      ? invoices.find(i => i.refNumber.toLowerCase() === invoiceRefRaw.toLowerCase())
      : undefined;

    const candidate = {
      invoiceId:       invoice?.id ?? "",
      invoiceRef:      invoice?.refNumber ?? "",
      customerId:      customer.id,
      customerName:    customer.fullName,
      amount:          raw["Amount"] ?? "",
      paymentMethod:   raw["Payment Method"] ?? "",
      paymentDate:     raw["Payment Date"] ?? "",
      referenceNumber: raw["Reference No."] ?? "",
      officeId:        office.officeId,
      officeName:      office.officeName,
      notes:           raw["Notes"] ?? "",
    };
    const check = paymentSchema.safeParse(candidate);
    if (!check.success) return { error: check.error.issues[0]?.message ?? "Invalid row" };
    return { data: check.data };
  }

  // Sequential (not Promise.all) on purpose: createPayment has a side effect
  // that patches the linked invoice's amountPaid, so concurrent payments
  // against the same invoice would race on that read-modify-write update.
  async function onImport(rows: PaymentSchema[]) {
    let created = 0, failed = 0;
    for (const row of rows) {
      const payload: PaymentFormData = {
        ...row,
        invoiceId:       row.invoiceId       || null,
        invoiceRef:      row.invoiceRef      || null,
        referenceNumber: row.referenceNumber || null,
        notes:           row.notes           || null,
        createdBy:       user?.uid ?? "",
      };
      try {
        await createPayment(payload, user?.uid ?? "");
        created++;
      } catch {
        failed++;
      }
    }
    return { created, failed };
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Payments"
        tourId="tour-payments-header"
        description={`${payments.length} payment${payments.length !== 1 ? "s" : ""} recorded`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            {canCreate && (
              <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setImportOpen(true)} data-tour-id="tour-payments-import">
                Import
              </Button>
            )}
            <BulkExportButton filenameBase="payments" rows={exportRows} />
            {canCreate && (
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setFormOpen(true)} data-tour-id="tour-payments-add">
                Record Payment
              </Button>
            )}
          </>
        }
      />

      {/* Stat tiles */}
      <div data-tour-id="tour-payments-stats" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      {/* Bulk import */}
      <BulkImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Payments"
        templateColumns={templateColumns}
        onParseRow={onParseRow}
        onImport={onImport}
      />

    </div>
  );
}
