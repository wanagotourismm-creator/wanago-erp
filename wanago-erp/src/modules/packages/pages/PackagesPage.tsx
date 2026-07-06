"use client";

import { useState, useMemo } from "react";
import { Plus, Search, RefreshCw } from "lucide-react";
import { usePackages } from "@/modules/packages/hooks/usePackages";
import { PackagesTable } from "@/modules/packages/components/PackagesTable";
import { PackageForm } from "@/modules/packages/components/PackageForm";
import { PackageDetailModal } from "@/modules/packages/components/PackageDetailModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import type { Package } from "@/modules/packages/types";
import type { PackageSchema } from "@/modules/packages/schemas";

const STATUS_FILTERS = [
  { value: "",         label: "All Packages" },
  { value: "active",   label: "Active"       },
  { value: "inactive", label: "Inactive"     },
];

export function PackagesPage() {
  const { packages, loading, addPackage, editPackage, removePackage, load } = usePackages();
  const { user } = useAuthStore();

  const [formOpen,       setFormOpen]       = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [viewingPackage, setViewingPackage] = useState<Package | null>(null);
  const [statusFilter,   setStatusFilter]   = useState("");
  const [search,         setSearch]         = useState("");

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

    </div>
  );
}
