"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, RefreshCw, Upload } from "lucide-react";
import { usePackages } from "@/modules/packages/hooks/usePackages";
import { PackagesTable } from "@/modules/packages/components/PackagesTable";
import { PackageForm } from "@/modules/packages/components/PackageForm";
import { PackageDetailModal } from "@/modules/packages/components/PackageDetailModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import { BulkImportModal, type TemplateColumn } from "@/components/bulk/BulkImportModal";
import { BulkExportButton } from "@/components/bulk/BulkExportButton";
import { resolveOffice } from "@/lib/bulk/resolveOffice";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import type { Office } from "@/modules/admin/offices/types";
import { packageSchema } from "@/modules/packages/schemas";
import type { Package, PackageFormData } from "@/modules/packages/types";
import type { PackageSchema } from "@/modules/packages/schemas";

const STATUS_FILTERS = [
  { value: "",         label: "All Packages" },
  { value: "active",   label: "Active"       },
  { value: "inactive", label: "Inactive"     },
];

const PACKAGE_TEMPLATE_COLUMNS: TemplateColumn[] = [
  { key: "title",          label: "Title",              required: true, example: "Maldives Honeymoon Special" },
  { key: "destination",    label: "Destination",        required: true, example: "Maldives" },
  { key: "category",       label: "Category",           required: true, example: "Honeymoon" },
  { key: "durationDays",   label: "Duration (Days)",    example: "5" },
  { key: "durationNights", label: "Duration (Nights)",  example: "4" },
  { key: "basePrice",      label: "Base Price",         example: "50000" },
  { key: "inclusions",     label: "Inclusions",         example: "" },
  { key: "exclusions",     label: "Exclusions",         example: "" },
  { key: "validFrom",      label: "Valid From",         example: "2026-01-01" },
  { key: "validTo",        label: "Valid To",           example: "2026-12-31" },
  { key: "packageStatus",  label: "Status",             example: "active" },
  { key: "officeName",     label: "Office",             example: "Head Office" },
  { key: "notes",          label: "Notes",              example: "" },
];

export function PackagesPage() {
  const { packages, loading, addPackage, editPackage, removePackage, load } = usePackages();
  const { user } = useAuthStore();

  const [formOpen,       setFormOpen]       = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [viewingPackage, setViewingPackage] = useState<Package | null>(null);
  const [statusFilter,   setStatusFilter]   = useState("");
  const [search,         setSearch]         = useState("");
  const [importOpen,     setImportOpen]     = useState(false);
  const [offices,        setOffices]        = useState<Office[]>([]);

  useEffect(() => { fetchOffices().then(setOffices).catch(() => {}); }, []);

  const filtered = useMemo(() => {
    return packages.filter((p) => {
      const matchStatus = !statusFilter || p.packageStatus === statusFilter;
      const matchSearch = !search || [p.title, p.destination, p.category, p.refNumber]
        .some(f => f?.toLowerCase().includes(search.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [packages, statusFilter, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    packages.forEach(p => { counts[p.packageStatus] = (counts[p.packageStatus] ?? 0) + 1; });
    return counts;
  }, [packages]);

  const exportRows = useMemo(() => filtered.map((p) => ({
    "Title":              p.title,
    "Destination":        p.destination,
    "Category":           p.category,
    "Duration (Days)":    p.durationDays,
    "Duration (Nights)":  p.durationNights,
    "Base Price":         p.basePrice,
    "Inclusions":         p.inclusions ?? "",
    "Exclusions":         p.exclusions ?? "",
    "Valid From":         p.validFrom ?? "",
    "Valid To":           p.validTo ?? "",
    "Status":             p.packageStatus,
    "Office":             p.officeName,
    "Notes":              p.notes ?? "",
  })), [filtered]);

  function onParsePackageRow(raw: Record<string, string>): { data: PackageFormData } | { error: string } {
    const office = resolveOffice(raw["Office"], offices, {
      officeId:   user?.officeId   ?? "",
      officeName: user?.officeName ?? "",
    });

    const statusRaw = raw["Status"]?.trim().toLowerCase();
    const candidate = {
      title:          raw["Title"]?.trim() ?? "",
      destination:    raw["Destination"]?.trim() ?? "",
      category:       raw["Category"]?.trim() ?? "",
      durationDays:   raw["Duration (Days)"]?.trim() || "0",
      durationNights: raw["Duration (Nights)"]?.trim() || "0",
      basePrice:      raw["Base Price"]?.trim() || "0",
      inclusions:     raw["Inclusions"]?.trim() ?? "",
      exclusions:     raw["Exclusions"]?.trim() ?? "",
      validFrom:      raw["Valid From"]?.trim() ?? "",
      validTo:        raw["Valid To"]?.trim() ?? "",
      officeId:       office.officeId,
      officeName:     office.officeName,
      notes:          raw["Notes"]?.trim() ?? "",
      packageStatus:  statusRaw === "inactive" ? "inactive" : "active",
    };

    const check = packageSchema.safeParse(candidate);
    if (!check.success) return { error: check.error.issues[0]?.message ?? "Invalid row" };

    const d = check.data;
    const data: PackageFormData = {
      title:          d.title,
      destination:    d.destination,
      category:       d.category,
      durationDays:   d.durationDays ?? 0,
      durationNights: d.durationNights ?? 0,
      basePrice:      d.basePrice ?? 0,
      inclusions:     d.inclusions || "",
      exclusions:     d.exclusions || "",
      validFrom:      d.validFrom || null,
      validTo:        d.validTo || null,
      officeId:       d.officeId,
      officeName:     d.officeName,
      notes:          d.notes || null,
      packageStatus:  d.packageStatus ?? "active",
      createdBy:      user?.uid ?? "",
    };
    return { data };
  }

  async function onImportPackages(rows: PackageFormData[]): Promise<{ created: number; failed: number }> {
    let created = 0, failed = 0;
    for (const row of rows) {
      const { error } = await addPackage(row);
      if (error) failed++; else created++;
    }
    return { created, failed };
  }

  async function handleSubmit(data: PackageSchema) {
    const payload = {
      ...data,
      inclusions: data.inclusions || "",
      exclusions: data.exclusions || "",
      validFrom:  data.validFrom  || null,
      validTo:    data.validTo    || null,
      notes:      data.notes      || null,
      createdBy:  user?.uid ?? "",
      status:     "active",
      refNumber:  editingPackage?.refNumber ?? "",
    };

    if (editingPackage) {
      await editPackage(editingPackage.id, payload);
    } else {
      await addPackage(payload as never);
    }
    setFormOpen(false);
    setEditingPackage(null);
  }

  function handleEdit(pkg: Package) {
    setViewingPackage(null);
    setEditingPackage(pkg);
    setFormOpen(true);
  }

  async function handleDelete(pkg: Package) {
    if (!confirm(`Delete package "${pkg.title}"? This cannot be undone.`)) return;
    setViewingPackage(null);
    await removePackage(pkg.id);
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Packages"
        description={`${packages.length} package${packages.length !== 1 ? "s" : ""} in your catalog`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setImportOpen(true)}>
              Import
            </Button>
            <BulkExportButton filenameBase="packages" rows={exportRows} />
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => { setEditingPackage(null); setFormOpen(true); }}
            >
              Add Package
            </Button>
          </>
        }
      />

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              "flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
              statusFilter === f.value
                ? "bg-primary text-white shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            )}
          >
            {f.label}
            <span className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              statusFilter === f.value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
            )}>
              {f.value ? (statusCounts[f.value] ?? 0) : packages.length}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by title, destination, category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <PackagesTable
        packages={filtered}
        loading={loading}
        onView={setViewingPackage}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Detail popup */}
      <PackageDetailModal
        pkg={viewingPackage ? filtered.find(p => p.id === viewingPackage.id) ?? viewingPackage : null}
        onClose={() => setViewingPackage(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Form drawer */}
      <PackageForm
        open={formOpen}
        pkg={editingPackage}
        onClose={() => { setFormOpen(false); setEditingPackage(null); }}
        onSubmit={handleSubmit}
      />

      {/* Bulk import */}
      <BulkImportModal<PackageFormData>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Packages"
        templateColumns={PACKAGE_TEMPLATE_COLUMNS}
        onParseRow={onParsePackageRow}
        onImport={onImportPackages}
      />

    </div>
  );
}
