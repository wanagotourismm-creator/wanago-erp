"use client";

import { useState, useMemo } from "react";
import { Plus, Search, RefreshCw, Receipt, Clock, CheckCircle2, Banknote } from "lucide-react";
import { useExpenses } from "@/modules/expenses/hooks/useExpenses";
import { ExpensesTable } from "@/modules/expenses/components/ExpensesTable";
import { ExpenseDetailModal } from "@/modules/expenses/components/ExpenseDetailModal";
import { ExpenseForm } from "@/modules/expenses/components/ExpenseForm";
import { formatAmount } from "@/modules/expenses/components/ExpenseBadges";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import type { Expense } from "@/modules/expenses/types";
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
        description={`${expenses.length} total expense${expenses.length !== 1 ? "s" : ""}`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => { setEditingExpense(null); setFormOpen(true); }}
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

    </div>
  );
}
