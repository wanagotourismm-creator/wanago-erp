"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, RefreshCw, Upload } from "lucide-react";
import { useSuppliers } from "@/modules/suppliers/hooks/useSuppliers";
import { SuppliersTable } from "@/modules/suppliers/components/SuppliersTable";
import { SupplierDetailModal } from "@/modules/suppliers/components/SupplierDetailModal";
import { SupplierForm } from "@/modules/suppliers/components/SupplierForm";
import { SUPPLIER_CATEGORIES } from "@/modules/suppliers/components/SupplierBadges";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import { BulkImportModal, type TemplateColumn } from "@/components/bulk/BulkImportModal";
import { BulkExportButton } from "@/components/bulk/BulkExportButton";
import { resolveOffice } from "@/lib/bulk/resolveOffice";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import type { Office } from "@/modules/admin/offices/types";
import { supplierSchema } from "@/modules/suppliers/schemas";
import type { Supplier, SupplierFormData } from "@/modules/suppliers/types";
import type { SupplierSchema } from "@/modules/suppliers/schemas";

const CATEGORY_FILTERS = [{ value: "", label: "All Suppliers" }, ...SUPPLIER_CATEGORIES];

const SUPPLIER_TEMPLATE_COLUMNS: TemplateColumn[] = [
  { key: "name",           label: "Name",           required: true, example: "Taj Hotels" },
  { key: "category",       label: "Category",       required: true, example: "Hotel" },
  { key: "contactPerson",  label: "Contact Person", required: true, example: "Rahul Sharma" },
  { key: "phone",          label: "Phone",          required: true, example: "+91 98765 43210" },
  { key: "email",          label: "Email",          example: "contact@supplier.com" },
  { key: "address",        label: "Address",        example: "" },
  { key: "city",           label: "City",           example: "Mumbai" },
  { key: "gstNumber",      label: "GST Number",     example: "" },
  { key: "paymentTerms",   label: "Payment Terms",  example: "Net 30" },
  { key: "supplierStatus", label: "Status",         example: "active" },
  { key: "officeName",     label: "Office",         example: "Head Office" },
  { key: "notes",          label: "Notes",          example: "" },
];

export function SuppliersPage() {
  const { suppliers, loading, addSupplier, editSupplier, removeSupplier, generateVendorLink, load } = useSuppliers();
  const { user } = useAuthStore();
  // Matches firestore.rules' suppliers write gate — Operations/Admin/Super
  // Admin only. These were hardcoded true for every role, so a sales/HR/
  // finance user saw fully-functional-looking Add/Edit/Delete buttons that
  // silently failed the rule.
  const canManage = !!user && (
    user.systemRole === "super_admin" || user.systemRole === "admin" || user.systemRole === "operations"
  );
  const canCreate = canManage;

  const [formOpen,        setFormOpen]        = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [categoryFilter,  setCategoryFilter]  = useState("");
  const [search,          setSearch]          = useState("");
  const [importOpen,      setImportOpen]      = useState(false);
  const [offices,         setOffices]         = useState<Office[]>([]);

  useEffect(() => { fetchOffices().then(setOffices).catch(() => {}); }, []);

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

  const exportRows = useMemo(() => filtered.map((s) => ({
    "Name":            s.name,
    "Category":        s.category,
    "Contact Person":  s.contactPerson,
    "Phone":           s.phone,
    "Email":           s.email ?? "",
    "Address":         s.address ?? "",
    "City":            s.city ?? "",
    "GST Number":      s.gstNumber ?? "",
    "Payment Terms":   s.paymentTerms ?? "",
    "Status":          s.supplierStatus,
    "Office":          s.officeName,
    "Notes":           s.notes ?? "",
  })), [filtered]);

  function onParseSupplierRow(raw: Record<string, string>): { data: SupplierFormData } | { error: string } {
    const office = resolveOffice(raw["Office"], offices, {
      officeId:   user?.officeId   ?? "",
      officeName: user?.officeName ?? "",
    });

    const statusRaw = raw["Status"]?.trim().toLowerCase();
    const candidate = {
      name:           raw["Name"]?.trim() ?? "",
      category:       raw["Category"]?.trim() || "Hotel",
      contactPerson:  raw["Contact Person"]?.trim() ?? "",
      phone:          raw["Phone"]?.trim() ?? "",
      email:          raw["Email"]?.trim() ?? "",
      address:        raw["Address"]?.trim() ?? "",
      city:           raw["City"]?.trim() ?? "",
      gstNumber:      raw["GST Number"]?.trim() ?? "",
      paymentTerms:   raw["Payment Terms"]?.trim() ?? "",
      officeId:       office.officeId,
      officeName:     office.officeName,
      notes:          raw["Notes"]?.trim() ?? "",
      supplierStatus: statusRaw === "inactive" ? "inactive" : "active",
    };

    const check = supplierSchema.safeParse(candidate);
    if (!check.success) return { error: check.error.issues[0]?.message ?? "Invalid row" };

    const d = check.data;
    const data: SupplierFormData = {
      name:           d.name,
      category:       d.category,
      contactPerson:  d.contactPerson,
      phone:          d.phone,
      email:          d.email || null,
      address:        d.address || null,
      city:           d.city || null,
      gstNumber:      d.gstNumber || null,
      paymentTerms:   d.paymentTerms || null,
      officeId:       d.officeId,
      officeName:     d.officeName,
      notes:          d.notes || null,
      supplierStatus: d.supplierStatus,
      createdBy:      user?.uid ?? "",
    };
    return { data };
  }

  async function onImportSuppliers(rows: SupplierFormData[]): Promise<{ created: number; failed: number }> {
    let created = 0, failed = 0;
    for (const row of rows) {
      const { error } = await addSupplier(row);
      if (error) failed++; else created++;
    }
    return { created, failed };
  }

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
        tourId="tour-suppliers-header"
        description={`${suppliers.length} total supplier${suppliers.length !== 1 ? "s" : ""} in your directory`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setImportOpen(true)} data-tour-id="tour-suppliers-import">
              Import
            </Button>
            <BulkExportButton filenameBase="suppliers" rows={exportRows} />
            {canCreate && (
              <Button
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => { setEditingSupplier(null); setFormOpen(true); }}
                data-tour-id="tour-suppliers-add"
              >
                Add Supplier
              </Button>
            )}
          </>
        }
      />

      {/* Category filter tabs */}
      <div data-tour-id="tour-suppliers-filters" className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
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
        onGenerateVendorLink={generateVendorLink}
      />

      {/* Form drawer */}
      <SupplierForm
        open={formOpen}
        supplier={editingSupplier}
        onClose={() => { setFormOpen(false); setEditingSupplier(null); }}
        onSubmit={handleSubmit}
      />

      {/* Bulk import */}
      <BulkImportModal<SupplierFormData>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Suppliers"
        templateColumns={SUPPLIER_TEMPLATE_COLUMNS}
        onParseRow={onParseSupplierRow}
        onImport={onImportSuppliers}
      />

    </div>
  );
}
