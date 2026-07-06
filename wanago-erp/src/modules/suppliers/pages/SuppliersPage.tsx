"use client";

import { useState, useMemo } from "react";
import { Plus, Search, RefreshCw } from "lucide-react";
import { useSuppliers } from "@/modules/suppliers/hooks/useSuppliers";
import { SuppliersTable } from "@/modules/suppliers/components/SuppliersTable";
import { SupplierDetailModal } from "@/modules/suppliers/components/SupplierDetailModal";
import { SupplierForm } from "@/modules/suppliers/components/SupplierForm";
import { SUPPLIER_CATEGORIES } from "@/modules/suppliers/components/SupplierBadges";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import type { Supplier } from "@/modules/suppliers/types";
import type { SupplierSchema } from "@/modules/suppliers/schemas";

const CATEGORY_FILTERS = [{ value: "", label: "All Suppliers" }, ...SUPPLIER_CATEGORIES];

export function SuppliersPage() {
  const { suppliers, loading, addSupplier, editSupplier, removeSupplier, load } = useSuppliers();
  const { user } = useAuthStore();
  const canManage = true;
  const canCreate = true;

  const [formOpen,        setFormOpen]        = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [categoryFilter,  setCategoryFilter]  = useState("");
  const [search,          setSearch]          = useState("");

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      const matchCategory = !categoryFilter || s.category === categoryFilter;
      const matchSearch = !search || [s.name, s.contactPerson, s.phone, s.email ?? "", s.city ?? ""]
        .some(f => f?.toLowerCase().includes(search.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [suppliers, categoryFilter, search]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    suppliers.forEach(s => { counts[s.category] = (counts[s.category] ?? 0) + 1; });
    return counts;
  }, [suppliers]);

  async function handleSubmit(data: SupplierSchema) {
    const payload = {
      ...data,
      email:          data.email          || null,
      address:        data.address        || null,
      city:           data.city           || null,
      gstNumber:      data.gstNumber      || null,
      paymentTerms:   data.paymentTerms   || null,
      notes:          data.notes          || null,
      createdBy:      user?.uid ?? "",
      status:         "active",
      refNumber:      editingSupplier?.refNumber ?? "",
    };

    if (editingSupplier) {
      await editSupplier(editingSupplier.id, payload);
    } else {
      await addSupplier(payload as never);
    }
    setFormOpen(false);
    setEditingSupplier(null);
  }

  function handleEdit(supplier: Supplier) {
    setViewingSupplier(null);
    setEditingSupplier(supplier);
    setFormOpen(true);
  }

  async function handleDelete(supplier: Supplier) {
    if (!confirm(`Delete supplier "${supplier.name}"? This cannot be undone.`)) return;
    setViewingSupplier(null);
    await removeSupplier(supplier.id);
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Suppliers"
        description={`${suppliers.length} total supplier${suppliers.length !== 1 ? "s" : ""} in your directory`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            {canCreate && (
              <Button
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => { setEditingSupplier(null); setFormOpen(true); }}
              >
                Add Supplier
              </Button>
            )}
          </>
        }
      />

      {/* Category filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setCategoryFilter(f.value)}
            className={cn(
              "flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
              categoryFilter === f.value
                ? "bg-primary text-white shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            )}
          >
            {f.label}
            <span className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              categoryFilter === f.value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
            )}>
              {f.value ? (categoryCounts[f.value] ?? 0) : suppliers.length}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name, contact, phone, city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <SuppliersTable
        suppliers={filtered}
        loading={loading}
        canManage={canManage}
        onView={setViewingSupplier}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Detail popup */}
      <SupplierDetailModal
        supplier={viewingSupplier ? filtered.find(s => s.id === viewingSupplier.id) ?? viewingSupplier : null}
        canManage={canManage}
        onClose={() => setViewingSupplier(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Form drawer */}
      <SupplierForm
        open={formOpen}
        supplier={editingSupplier}
        onClose={() => { setFormOpen(false); setEditingSupplier(null); }}
        onSubmit={handleSubmit}
      />

    </div>
  );
}
