"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Search, RefreshCw, Upload } from "lucide-react";
import { useItineraries } from "@/modules/itineraries/hooks/useItineraries";
import { ItinerariesTable } from "@/modules/itineraries/components/ItinerariesTable";
import { ItineraryForm } from "@/modules/itineraries/components/ItineraryForm";
import { ItineraryDetailModal } from "@/modules/itineraries/components/ItineraryDetailModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import { BulkImportModal, type TemplateColumn } from "@/components/bulk/BulkImportModal";
import { BulkExportButton } from "@/components/bulk/BulkExportButton";
import { resolveOffice } from "@/lib/bulk/resolveOffice";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import { itinerarySchema } from "@/modules/itineraries/schemas";
import type { Office } from "@/modules/admin/offices/types";
import type { Itinerary, ItineraryFormData } from "@/modules/itineraries/types";
import type { ItinerarySchema } from "@/modules/itineraries/schemas";

const STATUS_FILTERS = [
  { value: "",          label: "All Itineraries" },
  { value: "draft",     label: "Draft"     },
  { value: "confirmed", label: "Confirmed" },
];

// A flat spreadsheet row can't hold a nested days[] array directly, so the
// day-by-day plan is collapsed into numbered column pairs — Day 1 Title /
// Day 1 Description through Day 10 Title / Day 10 Description. 10 is enough
// for a first version; rows with no day columns filled import fine with an
// empty days[] (the schema defaults it to []).
const MAX_IMPORT_DAYS = 10;

const DAY_TEMPLATE_COLUMNS: TemplateColumn[] = Array.from({ length: MAX_IMPORT_DAYS }, (_, idx) => idx + 1)
  .flatMap((n) => [
    { key: `day${n}Title`,       label: `Day ${n} Title`,       example: n === 1 ? "Arrival & Check-in" : "" },
    { key: `day${n}Description`, label: `Day ${n} Description`, example: n === 1 ? "Airport pickup, hotel check-in, welcome dinner" : "" },
  ]);

const ITINERARY_TEMPLATE_COLUMNS: TemplateColumn[] = [
  { key: "title",        label: "Title",              required: true, example: "Bali Honeymoon Escape" },
  { key: "destination",  label: "Destination",        required: true, example: "Bali, Indonesia" },
  { key: "durationDays", label: "Duration (Days)",    required: true, example: "5" },
  { key: "package",      label: "Package",            example: "Bali Bliss 5N/6D" },
  { key: "status",       label: "Status",             example: "draft" },
  { key: "office",       label: "Office",             example: "Head Office" },
  { key: "notes",        label: "Notes",              example: "" },
  ...DAY_TEMPLATE_COLUMNS,
];

export function ItinerariesPage() {
  const { itineraries, loading, addItinerary, editItinerary, removeItinerary, load } = useItineraries();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [formOpen,        setFormOpen]        = useState(false);
  const [editingItinerary, setEditingItinerary] = useState<Itinerary | null>(null);
  const [viewingItinerary, setViewingItinerary] = useState<Itinerary | null>(null);
  const [statusFilter,    setStatusFilter]    = useState("");
  const [search,          setSearch]          = useState("");
  const [importOpen,      setImportOpen]      = useState(false);
  const [offices,         setOffices]         = useState<Office[]>([]);

  useEffect(() => { fetchOffices().then(setOffices).catch(() => {}); }, []);

  // Supports deep-linking straight into an itinerary's detail view, e.g.
  // from Global Search (/itineraries?view=<id>).
  useEffect(() => {
    const viewId = searchParams.get("view");
    if (!viewId || itineraries.length === 0) return;
    const match = itineraries.find((i) => i.id === viewId);
    if (match) setViewingItinerary(match);
    router.replace("/itineraries");
  }, [searchParams, itineraries, router]);

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

  const exportRows = useMemo(() => filtered.map((i) => {
    const row: Record<string, unknown> = {
      "Title":              i.title,
      "Destination":        i.destination,
      "Duration (Days)":    i.durationDays,
      "Package":            i.packageName ?? "",
      "Status":             i.itineraryStatus,
      "Office":             i.officeName,
      "Notes":              i.notes ?? "",
    };
    for (let n = 1; n <= MAX_IMPORT_DAYS; n++) {
      const day = i.days.find((d) => d.dayNumber === n);
      row[`Day ${n} Title`]       = day?.title ?? "";
      row[`Day ${n} Description`] = day?.description ?? "";
    }
    return row;
  }), [filtered]);

  function onParseItineraryRow(raw: Record<string, string>): { data: ItineraryFormData } | { error: string } {
    const office = resolveOffice(raw["Office"], offices, {
      officeId:   user?.officeId   ?? "",
      officeName: user?.officeName ?? "",
    });

    const days: { dayNumber: number; title: string; description: string }[] = [];
    for (let n = 1; n <= MAX_IMPORT_DAYS; n++) {
      const title = raw[`Day ${n} Title`]?.trim();
      if (title) {
        days.push({ dayNumber: n, title, description: raw[`Day ${n} Description`]?.trim() ?? "" });
      }
    }

    const candidate = {
      title:           raw["Title"]?.trim() ?? "",
      destination:     raw["Destination"]?.trim() ?? "",
      durationDays:    raw["Duration (Days)"]?.trim() || "1",
      packageName:     raw["Package"]?.trim() ?? "",
      days,
      officeId:        office.officeId,
      officeName:      office.officeName,
      notes:           raw["Notes"]?.trim() ?? "",
      itineraryStatus: raw["Status"]?.trim() || "draft",
    };

    const check = itinerarySchema.safeParse(candidate);
    if (!check.success) return { error: check.error.issues[0]?.message ?? "Invalid row" };

    const d = check.data;
    const data: ItineraryFormData = {
      title:           d.title,
      destination:     d.destination,
      durationDays:    d.durationDays,
      tripType:        d.tripType || null,
      packageName:     d.packageName || null,
      days:            d.days,
      tagline:         d.tagline || null,
      inclusions:      d.inclusions,
      exclusions:      d.exclusions,
      officeId:        d.officeId,
      officeName:      d.officeName,
      notes:           d.notes || null,
      itineraryStatus: d.itineraryStatus,
      createdBy:       user?.uid ?? "",
    };
    return { data };
  }

  async function onImportItineraries(rows: ItineraryFormData[]): Promise<{ created: number; failed: number }> {
    let created = 0, failed = 0;
    for (const row of rows) {
      const { error } = await addItinerary(row);
      if (error) failed++; else created++;
    }
    return { created, failed };
  }

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
        tourId="tour-itineraries-header"
        description={`${itineraries.length} total itinerar${itineraries.length !== 1 ? "ies" : "y"}`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setImportOpen(true)} data-tour-id="tour-itineraries-import">
              Import
            </Button>
            <BulkExportButton filenameBase="itineraries" rows={exportRows} />
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => { setEditingItinerary(null); setFormOpen(true); }}
              data-tour-id="tour-itineraries-add"
            >
              Add Itinerary
            </Button>
          </>
        }
      />

      {/* Status filter tabs */}
      <div data-tour-id="tour-itineraries-filters" className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
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

      {/* Bulk import */}
      <BulkImportModal<ItineraryFormData>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Itineraries"
        description="Upload a .csv or .xlsx file. The day-by-day plan uses paired columns Day 1 Title/Description through Day 10 Title/Description — only days with a Title filled in are imported."
        templateColumns={ITINERARY_TEMPLATE_COLUMNS}
        onParseRow={onParseItineraryRow}
        onImport={onImportItineraries}
      />

    </div>
  );
}
