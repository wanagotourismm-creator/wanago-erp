"use client";

import { useState, useMemo } from "react";
import { Plus, Search, RefreshCw } from "lucide-react";
import { useCustomers } from "@/modules/customers/hooks/useCustomers";
import { CustomersTable } from "@/modules/customers/components/CustomersTable";
import { CustomerForm } from "@/modules/customers/components/CustomerForm";
import { CUSTOMER_TYPES } from "@/modules/customers/components/CustomerBadges";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils/helpers";
import type { Customer } from "@/modules/customers/types";
import type { CustomerSchema } from "@/modules/customers/schemas";

const TYPE_FILTERS = [{ value: "", label: "All Customers" }, ...CUSTOMER_TYPES];

export function CustomersPage() {
  const { customers, loading, addCustomer, editCustomer, removeCustomer, load } = useCustomers();
  const { user } = useAuthStore();
  const canManage = !!user && hasPermission(user.systemRole, "customers:edit");
  const canCreate = !!user && hasPermission(user.systemRole, "customers:create");

  const [formOpen,        setFormOpen]        = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [typeFilter,      setTypeFilter]      = useState("");
  const [search,          setSearch]          = useState("");

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchType   = !typeFilter || c.customerType === typeFilter;
      const matchSearch = !search || [c.fullName, c.phone, c.email ?? "", c.city ?? ""]
        .some(f => f?.toLowerCase().includes(search.toLowerCase()));
      return matchType && matchSearch;
    });
  }, [customers, typeFilter, search]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    customers.forEach(c => { counts[c.customerType] = (counts[c.customerType] ?? 0) + 1; });
    return counts;
  }, [customers]);

  async function handleSubmit(data: CustomerSchema) {
    const payload = {
      ...data,
      email:          data.email          || null,
      alternatePhone: data.alternatePhone || null,
      city:           data.city           || null,
      address:        data.address        || null,
      notes:          data.notes          || null,
      createdBy:      user?.uid ?? "",
      status:         "active",
      refNumber:      editingCustomer?.refNumber ?? "",
    };

    if (editingCustomer) {
      await editCustomer(editingCustomer.id, payload);
    } else {
      await addCustomer(payload as never);
    }
    setFormOpen(false);
    setEditingCustomer(null);
  }

  function handleEdit(customer: Customer) {
    setEditingCustomer(customer);
    setFormOpen(true);
  }

  async function handleDelete(customer: Customer) {
    if (!confirm(`Delete customer "${customer.fullName}"? This cannot be undone.`)) return;
    await removeCustomer(customer.id);
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Customers"
        description={`${customers.length} total customer${customers.length !== 1 ? "s" : ""} in your directory`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            {canCreate && (
              <Button
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => { setEditingCustomer(null); setFormOpen(true); }}
              >
                Add Customer
              </Button>
            )}
          </>
        }
      />

      {/* Type filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setTypeFilter(f.value)}
            className={cn(
              "flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
              typeFilter === f.value
                ? "bg-primary text-white shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            )}
          >
            {f.label}
            <span className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              typeFilter === f.value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
            )}>
              {f.value ? (typeCounts[f.value] ?? 0) : customers.length}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name, phone, email, city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <CustomersTable
        customers={filtered}
        loading={loading}
        canManage={canManage}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Form drawer */}
      <CustomerForm
        open={formOpen}
        customer={editingCustomer}
        onClose={() => { setFormOpen(false); setEditingCustomer(null); }}
        onSubmit={handleSubmit}
      />

    </div>
  );
}
