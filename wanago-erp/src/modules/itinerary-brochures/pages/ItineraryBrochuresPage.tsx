"use client";

import { useState, useMemo } from "react";
import { Plus, Search, RefreshCw } from "lucide-react";
import { useItineraryBrochures } from "@/modules/itinerary-brochures/hooks/useItineraryBrochures";
import { ItineraryBrochuresTable } from "@/modules/itinerary-brochures/components/ItineraryBrochuresTable";
import { ItineraryBrochureForm } from "@/modules/itinerary-brochures/components/ItineraryBrochureForm";
import { ItineraryBrochureDetailModal } from "@/modules/itinerary-brochures/components/ItineraryBrochureDetailModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import type { ItineraryBrochure } from "@/modules/itinerary-brochures/types";
import type { ItineraryBrochureSchema } from "@/modules/itinerary-brochures/schemas";

const STATUS_FILTERS = [
  { value: "",         label: "All Brochures" },
  { value: "draft",    label: "Draft"    },
  { value: "sent",     label: "Sent"     },
  { value: "archived", label: "Archived" },
];

export function ItineraryBrochuresPage() {
  const { brochures, loading, addBrochure, editBrochure, removeBrochure, cloneBrochure, generatePdf, load } = useItineraryBrochures();
  const { user } = useAuthStore();

  const [formOpen,        setFormOpen]        = useState(false);
  const [editingBrochure, setEditingBrochure] = useState<ItineraryBrochure | null>(null);
  const [viewingBrochure, setViewingBrochure] = useState<ItineraryBrochure | null>(null);
  const [statusFilter,    setStatusFilter]    = useState("");
  const [search,          setSearch]          = useState("");

  const filtered = useMemo(() => {
    return brochures.filter((b) => {
      const matchStatus = !statusFilter || b.brochureStatus === statusFilter;
      const matchSearch = !search || [b.destination, b.route ?? "", b.customerName ?? ""]
        .some(f => f?.toLowerCase().includes(search.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [brochures, statusFilter, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    brochures.forEach(b => { counts[b.brochureStatus] = (counts[b.brochureStatus] ?? 0) + 1; });
    return counts;
  }, [brochures]);

  async function handleSubmit(data: ItineraryBrochureSchema) {
    const payload = {
      ...data,
      route:        data.route || null,
      tagline:      data.tagline || null,
      customerName: data.customerName || null,
      packagePrice: data.packagePrice ?? null,
      days:         data.days.map((d) => ({ ...d, imageUrl: d.imageUrl || null })),
      createdBy:    user?.uid ?? "",
    };

    if (editingBrochure) {
      await editBrochure(editingBrochure.id, payload);
    } else {
      await addBrochure(payload as never);
    }
    setFormOpen(false);
    setEditingBrochure(null);
  }

  function handleEdit(brochure: ItineraryBrochure) {
    setViewingBrochure(null);
    setEditingBrochure(brochure);
    setFormOpen(true);
  }

  async function handleDelete(brochure: ItineraryBrochure) {
    if (!confirm(`Delete itinerary brochure for "${brochure.destination}"? This cannot be undone.`)) return;
    setViewingBrochure(null);
    await removeBrochure(brochure.id);
  }

  async function handleDuplicate(brochure: ItineraryBrochure) {
    setViewingBrochure(null);
    await cloneBrochure(brochure);
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Itinerary Brochures"
        description={`${brochures.length} total brochure${brochures.length !== 1 ? "s" : ""}`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => { setEditingBrochure(null); setFormOpen(true); }}
            >
              New Brochure
            </Button>
          </>
        }
      />

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
            {f.value && statusCounts[f.value] !== undefined && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                statusFilter === f.value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}>
                {statusCounts[f.value] ?? 0}
              </span>
            )}
            {!f.value && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                statusFilter === f.value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}>
                {brochures.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by destination, route, customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <ItineraryBrochuresTable
        brochures={filtered}
        loading={loading}
        onView={setViewingBrochure}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
      />

      <ItineraryBrochureDetailModal
        brochure={viewingBrochure ? filtered.find(b => b.id === viewingBrochure.id) ?? viewingBrochure : null}
        onClose={() => setViewingBrochure(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onGeneratePdf={generatePdf}
      />

      <ItineraryBrochureForm
        open={formOpen}
        brochure={editingBrochure}
        onClose={() => { setFormOpen(false); setEditingBrochure(null); }}
        onSubmit={handleSubmit}
      />

    </div>
  );
}
