"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Filter, RefreshCw } from "lucide-react";
import { useLeads } from "@/modules/leads/hooks/useLeads";
import { LeadsTable } from "@/modules/leads/components/LeadsTable";
import { LeadForm } from "@/modules/leads/components/LeadForm";
import { LeadDetailModal } from "@/modules/leads/components/LeadDetailModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { LEAD_STAGE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils/helpers";
import type { Lead } from "@/modules/leads/types";
import type { LeadSchema } from "@/modules/leads/schemas";

const STAGE_FILTERS = [
  { value: "",          label: "All Leads" },
  { value: "new",       label: "New"        },
  { value: "contacted", label: "Contacted"  },
  { value: "follow_up", label: "Follow-up"  },
  { value: "quoted",    label: "Quoted"     },
  { value: "negotiation",label:"Negotiation"},
  { value: "won",       label: "Won"        },
  { value: "lost",      label: "Lost"       },
];

export function LeadsPage() {
  const { leads, loading, addLead, editLead, changeStage, removeLead, load } = useLeads();
  const { user } = useAuthStore();

  const [formOpen,    setFormOpen]    = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [stageFilter, setStageFilter] = useState("");
  const [search,      setSearch]      = useState("");

  // Filter leads
  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchStage  = !stageFilter || l.stage === stageFilter;
      const matchSearch = !search || [l.name, l.phone, l.destination, l.email ?? ""]
        .some(f => f?.toLowerCase().includes(search.toLowerCase()));
      return matchStage && matchSearch;
    });
  }, [leads, stageFilter, search]);

  // Stage counts
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => { counts[l.stage] = (counts[l.stage] ?? 0) + 1; });
    return counts;
  }, [leads]);

  async function handleSubmit(data: LeadSchema) {
    const payload = {
      ...data,
      email:          data.email          || null,
      alternatePhone: data.alternatePhone  || null,
      notes:          data.notes           || null,
      assignedTo:     data.assignedTo      || null,
      agentName:      data.agentName       || null,
      travelDate:     data.travelDate      || null,
      returnDate:     data.returnDate      || null,
      tripType:       data.tripType        || null,
      source:         data.source          || null,
      pax:            data.pax             || null,
      lastContactedAt:null,
      createdBy:      user?.uid ?? "",
      status:         "active",
      refNumber:      editingLead?.refNumber ?? "",
    };

    if (editingLead) {
      await editLead(editingLead.id, payload);
    } else {
      await addLead(payload as never);
    }
    setFormOpen(false);
    setEditingLead(null);
  }

  function handleEdit(lead: Lead) {
    setViewingLead(null);
    setEditingLead(lead);
    setFormOpen(true);
  }

  async function handleDelete(lead: Lead) {
    if (!confirm(`Delete lead "${lead.name}"? This cannot be undone.`)) return;
    setViewingLead(null);
    await removeLead(lead.id);
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Leads"
        description={`${leads.length} total lead${leads.length !== 1 ? "s" : ""} in your pipeline`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => { setEditingLead(null); setFormOpen(true); }}
            >
              Add Lead
            </Button>
          </>
        }
      />

      {/* Stage filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {STAGE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStageFilter(f.value)}
            className={cn(
              "flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
              stageFilter === f.value
                ? "bg-primary text-white shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            )}
          >
            {f.label}
            {f.value && stageCounts[f.value] !== undefined && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                stageFilter === f.value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}>
                {stageCounts[f.value] ?? 0}
              </span>
            )}
            {!f.value && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                stageFilter === f.value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}>
                {leads.length}
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
          placeholder="Search by name, phone, destination..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <LeadsTable
        leads={filtered}
        loading={loading}
        onView={setViewingLead}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStage={(lead, stage) => changeStage(lead.id, stage)}
      />

      {/* Detail popup */}
      <LeadDetailModal
        lead={viewingLead ? filtered.find(l => l.id === viewingLead.id) ?? viewingLead : null}
        onClose={() => setViewingLead(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStage={(lead, stage) => changeStage(lead.id, stage)}
      />

      {/* Form drawer */}
      <LeadForm
        open={formOpen}
        lead={editingLead}
        onClose={() => { setFormOpen(false); setEditingLead(null); }}
        onSubmit={handleSubmit}
      />

    </div>
  );
}
