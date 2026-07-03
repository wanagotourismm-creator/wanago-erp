"use client";

import { useState, useMemo } from "react";
import { Plus, Search, RefreshCw, Users } from "lucide-react";
import { useCustomers } from "@/modules/customers/hooks/useCustomers";
import { CustomersTable } from "@/modules/customers/components/CustomersTable";
import { CustomerForm } from "@/modules/customers/components/CustomerForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import type { Customer } from "@/modules/customers/types";
import type { CustomerSchema } from "@/modules/customers/schemas";

export function CustomersPage() {
  const { customers, loading, addCustomer, editCustomer, removeCustomer, load } = useCustomers();
  const { user } = useAuthStore();

  const [formOpen,       setFormOpen]       = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [search,         setSearch]         = useState("");

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      [c.name, c.phone, c.email ?? "", c.city ?? "", c.country]
        .some(f => f?.toLowerCase().includes(q))
    );
  }, [customers, search]);

  // Stats
  const totalRevenue  = customers.reduce((s, c) => s + (c.totalRevenue ?? 0), 0);
  const totalBookings = customers.reduce((s, c) => s + (c.totalBookings ?? 0), 0);

  async function handleSubmit(data: CustomerSchema) {
    const payload = {
      ...data,
      email:          data.email          || null,
      alternatePhone: data.alternatePhone || null,
      dateOfBirth:    data.dateOfBirth    || null,
      anniversary:    data.anniversary    || null,
      city:           data.city           || null,
      state:          data.state          || null,
      pincode:        data.pincode        || null,
      assignedTo:     data.assignedTo     || null,
      agentName:      data.agentName      || null,
      source:         data.source         || null,
      notes:          data.notes          || null,
      gender:         data.gender         || null,
      createdBy:      user?.uid ?? "",
      status:         "active",
    };

    if (editingCustomer) {
      await editCustomer(editingCustomer.id, payload as never);
    } else {
      await addCustomer(payload as never);
    }
    setFormOpen(false);
    setEditingCustomer(null);
  }

  function handleEdit(c: Customer) {
    setEditingCustomer(c);
    setFormOpen(true);
  }

  async function handleDelete(c: Customer) {
    if (!confirm(`Delete customer "${c.name}"? This cannot be undone.`)) return;
    await removeCustomer(c.id);
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Customers"
        description={`${customers.length} total customer${customers.length !== 1 ? "s" : ""}`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            <Button size="sm" icon={<Plus size={14} />}
              onClick={() => { setEditingCustomer(null); setFormOpen(true); }}>
              Add Customer
            </Button>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Customers", value: customers.length, icon: "👥" },
          { label: "Total Bookings",  value: totalBookings,    icon: "📅" },
          { label: "Total Revenue",   value: `₹${totalRevenue.toLocaleString("en-IN")}`, icon: "💰" },
        ].map(s => (
          <div key={s.label} className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
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
          placeholder="Search by name, phone, email, city..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <CustomersTable
        customers={filtered}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Form */}
      <CustomerForm
        open={formOpen}
        customer={editingCustomer}
        onClose={() => { setFormOpen(false); setEditingCustomer(null); }}
        onSubmit={handleSubmit}
      />

    </div>
  );
}
