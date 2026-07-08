"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, RefreshCw, Receipt, Clock, CheckCircle2, Banknote, Upload } from "lucide-react";
import { useExpenses } from "@/modules/expenses/hooks/useExpenses";
import { ExpensesTable } from "@/modules/expenses/components/ExpensesTable";
import { ExpenseDetailModal } from "@/modules/expenses/components/ExpenseDetailModal";
import { ExpenseForm } from "@/modules/expenses/components/ExpenseForm";
import { formatAmount } from "@/modules/expenses/components/ExpenseBadges";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import { BulkImportModal, type TemplateColumn } from "@/components/bulk/BulkImportModal";
import { BulkExportButton } from "@/components/bulk/BulkExportButton";
import { resolveOffice } from "@/lib/bulk/resolveOffice";
import { createExpense } from "@/modules/expenses/services/expense.service";
import { expenseSchema } from "@/modules/expenses/schemas";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import type { Office } from "@/modules/admin/offices/types";
import type { Expense, ExpenseFormData } from "@/modules/expenses/types";
import type { ExpenseSchema } from "@/modules/expenses/schemas";

const STATUS_FILTERS = [
  { value: "",          label: "All" },
  { value: "pending",   label: "Pending" },
  { value: "approved",  label: "Approved" },
  { value: "paid",      label: "Paid" },
  { value: "rejected",  label: "Rejected" },
];

export function ExpensesPage() {
  const { expenses, loading, addExpense, editExpense, changeStatus, removeExpense, load } = useExpenses();
  const { user } = useAuthStore();

  const [formOpen,       setFormOpen]       = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [statusFilter,   setStatusFilter]   = useState("");
  const [search,         setSearch]         = useState("");
  const [importOpen,     setImportOpen]     = useState(false);
  const [offices,        setOffices]        = useState<Office[]>([]);

  useEffect(() => { fetchOffices().then(setOffices); }, []);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchStatus = !statusFilter || e.expenseStatus === statusFilter;
      const matchSearch = !search || [e.category, e.description, e.vendor ?? "", e.refNumber]
        .some(f => f?.toLowerCase().includes(search.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [expenses, statusFilter, search]);

  const stats = useMemo(() => {
    const pending = expenses.filter(e => e.expenseStatus === "pending").length;
    const paid    = expenses.filter(e => e.expenseStatus === "paid").length;
    const total   = expenses.reduce((sum, e) => sum + e.amount, 0);
    return { count: expenses.length, pending, paid, total };
  }, [expenses]);

  async function handleSubmit(data: ExpenseSchema, receiptFile: File | null) {
    const payload = {
      ...data,
      vendor: data.vendor || null,
      notes:  data.notes  || null,
      createdBy: user?.uid ?? "",
    };

    if (editingExpense) {
      await editExpense(editingExpense.id, payload, receiptFile);
    } else {
      await addExpense(payload, receiptFile);
    }
    setFormOpen(false);
    setEditingExpense(null);
  }

  const exportRows = useMemo(() => filtered.map((e) => ({
    Category:    e.category,
    Amount:      e.amount,
    "Expense Date": e.expenseDate,
    Vendor:      e.vendor ?? "",
    Description: e.description,
    Office:      e.officeName,
    Notes:       e.notes ?? "",
    Status:      e.expenseStatus,
  })), [filtered]);

  const templateColumns: TemplateColumn[] = [
    { key: "category", label: "Category", required: true, example: "Travel" },
    { key: "amount", label: "Amount", required: true, example: "1500" },
    { key: "expenseDate", label: "Expense Date", required: true, example: "2026-01-01" },
    { key: "vendor", label: "Vendor", example: "Acme Corp" },
    { key: "description", label: "Description", required: true, example: "Taxi fare" },
    { key: "office", label: "Office", example: "Head Office" },
    { key: "notes", label: "Notes" },
    { key: "status", label: "Status", example: "pending" },
  ];

  function onParseRow(raw: Record<string, string>) {
    const office = resolveOffice(raw["Office"], offices, {
      officeId: user?.officeId ?? "",
      officeName: user?.officeName ?? "",
    });
    const candidate = {
      category: raw["Category"] ?? "",
      amount: raw["Amount"] ?? "",
      expenseDate: raw["Expense Date"] ?? "",
      vendor: raw["Vendor"] ?? "",
      description: raw["Description"] ?? "",
      officeId: office.officeId,
      officeName: office.officeName,
      notes: raw["Notes"] ?? "",
      expenseStatus: (raw["Status"]?.trim() || "pending") as ExpenseSchema["expenseStatus"],
    };
    const check = expenseSchema.safeParse(candidate);
    if (!check.success) return { error: check.error.issues[0]?.message ?? "Invalid row" };
    return { data: check.data };
  }

  async function onImport(rows: ExpenseSchema[]) {
    let created = 0, failed = 0;
    for (const row of rows) {
      const payload: ExpenseFormData = {
        ...row,
        vendor: row.vendor || null,
        notes:  row.notes  || null,
        createdBy: user?.uid ?? "",
      };
      try {
        await createExpense(payload, user?.uid ?? "");
        created++;
      } catch {
        failed++;
      }
    }
    return { created, failed };
  }

  function handleEdit(expense: Expense) {
    setViewingExpense(null);
    setEditingExpense(expense);
    setFormOpen(true);
  }

  async function handleDelete(expense: Expense) {
    if (!confirm(`Delete expense "${expense.refNumber}"? This cannot be undone.`)) return;
    setViewingExpense(null);
    await removeExpense(expense.id);
  }

  async function handleStatusChange(expense: Expense, status: Expense["expenseStatus"]) {
    await changeStatus(expense.id, status);
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Expenses"
        tourId="tour-expenses-header"
        description={`${expenses.length} total expense${expenses.length !== 1 ? "s" : ""}`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setImportOpen(true)}>
              Import
            </Button>
            <BulkExportButton filenameBase="expenses" rows={exportRows} />
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => { setEditingExpense(null); setFormOpen(true); }}
              data-tour-id="tour-expenses-add"
            >
              New Expense
            </Button>
          </>
        }
      />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Expenses", value: stats.count,                 icon: Receipt,      color: "text-primary"   },
          { label: "Pending",        value: stats.pending,                icon: Clock,        color: "text-amber-600" },
          { label: "Paid",           value: stats.paid,                   icon: CheckCircle2, color: "text-green-600" },
          { label: "Total Amount",   value: formatAmount(stats.total),    icon: Banknote,     color: "text-primary"   },
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
          placeholder="Search by category, vendor, ref number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <ExpensesTable
        expenses={filtered}
        loading={loading}
        onView={setViewingExpense}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Detail popup */}
      <ExpenseDetailModal
        expense={viewingExpense ? filtered.find(e => e.id === viewingExpense.id) ?? viewingExpense : null}
        onClose={() => setViewingExpense(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />

      {/* Form drawer */}
      <ExpenseForm
        open={formOpen}
        expense={editingExpense}
        onClose={() => { setFormOpen(false); setEditingExpense(null); }}
        onSubmit={handleSubmit}
      />

      {/* Bulk import */}
      <BulkImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Expenses"
        description="Upload a .csv or .xlsx file to create many expenses at once (receipts must be attached manually afterward)"
        templateColumns={templateColumns}
        onParseRow={onParseRow}
        onImport={onImport}
      />

    </div>
  );
}
