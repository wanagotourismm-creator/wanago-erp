"use client";

import { useState, useMemo } from "react";
import { Plus, Search, RefreshCw } from "lucide-react";
import { useItineraries } from "@/modules/itineraries/hooks/useItineraries";
import { ItinerariesTable } from "@/modules/itineraries/components/ItinerariesTable";
import { ItineraryForm } from "@/modules/itineraries/components/ItineraryForm";
import { ItineraryDetailModal } from "@/modules/itineraries/components/ItineraryDetailModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import type { Itinerary } from "@/modules/itineraries/types";
import type { ItinerarySchema } from "@/modules/itineraries/schemas";

const STATUS_FILTERS = [
  { value: "",          label: "All Itineraries" },
  { value: "draft",     label: "Draft"     },
  { value: "confirmed", label: "Confirmed" },
];

export function ItinerariesPage() {
  const { itineraries, loading, addItinerary, editItinerary, removeItinerary, load } = useItineraries();
  const { user } = useAuthStore();

  const [formOpen,        setFormOpen]        = useState(false);
  const [editingItinerary, setEditingItinerary] = useState<Itinerary | null>(null);
  const [viewingItinerary, setViewingItinerary] = useState<Itinerary | null>(null);
  const [statusFilter,    setStatusFilter]    = useState("");
  const [search,          setSearch]          = useState("");

  // Filter itineraries
  const filtered = useMemo(() => {
    return itineraries.filter((i) => {
      const matchStatus = !statusFilter || i.itineraryStatus === statusFilter;
      const matchSearch = !search || [i.title, i.destination, i.packageName ?? ""]
        .some(f => f?.toLowerCase().includes(search.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [itineraries, statusFilter, search]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    itineraries.forEach(i => { counts[i.itineraryStatus] = (counts[i.itineraryStatus] ?? 0) + 1; });
    return counts;
  }, [itineraries]);

  async function handleSubmit(data: ItinerarySchema) {
    const payload = {
      ...data,
      packageName: data.packageName || null,
      notes:       data.notes       || null,
      createdBy:   user?.uid ?? "",
      status:      "active",
      refNumber:   editingItinerary?.refNumber ?? "",
    };

    if (editingItinerary) {
      await editItinerary(editingItinerary.id, payload);
    } else {
      await addItinerary(payload as never);
    }
    setFormOpen(false);
    setEditingItinerary(null);
  }

  function handleEdit(itinerary: Itinerary) {
    setViewingItinerary(null);
    setEditingItinerary(itinerary);
    setFormOpen(true);
  }

  async function handleDelete(itinerary: Itinerary) {
    if (!confirm(`Delete itinerary "${itinerary.title}"? This cannot be undone.`)) return;
    setViewingItinerary(null);
    await removeItinerary(itinerary.id);
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Itineraries"
        description={`${itineraries.length} total itinerar${itineraries.length !== 1 ? "ies" : "y"}`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => { setEditingItinerary(null); setFormOpen(true); }}
            >
              Add Itinerary
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
                {itineraries.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by title, destination, package..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <ItinerariesTable
        itineraries={filtered}
        loading={loading}
        onView={setViewingItinerary}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Detail popup */}
      <ItineraryDetailModal
        itinerary={viewingItinerary ? filtered.find(i => i.id === viewingItinerary.id) ?? viewingItinerary : null}
        onClose={() => setViewingItinerary(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Form drawer */}
      <ItineraryForm
        open={formOpen}
        itinerary={editingItinerary}
        onClose={() => { setFormOpen(false); setEditingItinerary(null); }}
        onSubmit={handleSubmit}
      />

    </div>
  );
}
