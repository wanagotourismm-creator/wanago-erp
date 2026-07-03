"use client";
import { useState, useMemo } from "react";
import { Plus, Search, RefreshCw } from "lucide-react";
import { useSuppliers } from "@/modules/suppliers/hooks/useSuppliers";
import { SuppliersTable } from "@/modules/suppliers/components/SuppliersTable";
import { SupplierForm } from "@/modules/suppliers/components/SupplierForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import type { Supplier } from "@/modules/suppliers/types";
import type { SupplierSchema } from "@/modules/suppliers/schemas";

export function SuppliersPage() {
  const { suppliers, loading, addSupplier, editSupplier, removeSupplier, load } = useSuppliers();
  const { user } = useAuthStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => suppliers.filter(s => !search || [s.name, s.phone, s.city ?? "", s.category].some(f => f?.toLowerCase().includes(search.toLowerCase()))), [suppliers, search]);

  async function handleSubmit(data: SupplierSchema) {
    const payload = { ...data, contactName: data.contactName || null, email: data.email || null, website: data.website || null, city: data.city || null, address: data.address || null, gstNumber: data.gstNumber || null, panNumber: data.panNumber || null, bankName: data.bankName || null, accountNumber: data.accountNumber || null, ifscCode: data.ifscCode || null, notes: data.notes || null, tags: data.tags || [] };
    if (editing) await editSupplier(editing.id, payload as never);
    else await addSupplier(payload as never);
    setFormOpen(false); setEditing(null);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Suppliers" description={`${suppliers.length} total suppliers`}
        actions={<><Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={load}>Refresh</Button><Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditing(null); setFormOpen(true); }}>Add Supplier</Button></>} />
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" />
      </div>
      <SuppliersTable suppliers={filtered} loading={loading}
        onEdit={s => { setEditing(s); setFormOpen(true); }}
        onDelete={async s => { if (confirm(`Delete supplier "${s.name}"?`)) await removeSupplier(s.id); }} />
      <SupplierForm open={formOpen} supplier={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSubmit={handleSubmit} />
    </div>
  );
}
