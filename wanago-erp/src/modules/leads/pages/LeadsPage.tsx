"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Search, RefreshCw, Upload } from "lucide-react";
import { useLeads } from "@/modules/leads/hooks/useLeads";
import { LeadsTable } from "@/modules/leads/components/LeadsTable";
import { LeadForm } from "@/modules/leads/components/LeadForm";
import { LeadDetailModal } from "@/modules/leads/components/LeadDetailModal";
import { PullToRefresh } from "@/components/shared/PullToRefresh";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import { BulkImportModal, type TemplateColumn } from "@/components/bulk/BulkImportModal";
import { BulkExportButton } from "@/components/bulk/BulkExportButton";
import { resolveOffice } from "@/lib/bulk/resolveOffice";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import { findCustomerByReferralCode } from "@/modules/referrals/services/referral.service";
import type { Office } from "@/modules/admin/offices/types";
import { leadSchema } from "@/modules/leads/schemas";
import type { Lead, LeadFormData } from "@/modules/leads/types";
import type { LeadSchema } from "@/modules/leads/schemas";

const LEAD_TEMPLATE_COLUMNS: TemplateColumn[] = [
  { key: "name",           label: "Name",              required: true, example: "Rahul Sharma" },
  { key: "phone",          label: "Phone",             required: true, example: "+91 98765 43210" },
  { key: "destination",    label: "Destination",       required: true, example: "Maldives" },
  { key: "email",          label: "Email",             example: "rahul@example.com" },
  { key: "alternatePhone", label: "Alternate Phone",   example: "+91 98765 43211" },
  { key: "tripType",       label: "Trip Type",         example: "honeymoon" },
  { key: "travelDate",     label: "Travel Date",       example: "2026-08-01" },
  { key: "returnDate",     label: "Return Date",       example: "2026-08-08" },
  { key: "duration",       label: "Duration (Nights)", example: "7" },
  { key: "pax",            label: "Pax",               example: "2" },
  { key: "budget",         label: "Budget",            example: "150000" },
  { key: "stage",          label: "Stage",             example: "new" },
  { key: "priority",       label: "Priority",          example: "warm" },
  { key: "source",         label: "Source",            example: "Website" },
  { key: "assignedTo",     label: "Assigned To",       example: "" },
  { key: "agentName",      label: "Agent Name",        example: "" },
  { key: "officeName",     label: "Office",            example: "Head Office" },
  { key: "notes",          label: "Notes",             example: "" },
];

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
  const { leads, loading, addLead, editLead, changeStage, removeLead, generateLink, load } = useLeads();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [formOpen,    setFormOpen]    = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [stageFilter, setStageFilter] = useState("");
  const [search,      setSearch]      = useState("");
  const [importOpen,  setImportOpen]  = useState(false);
  const [offices,     setOffices]     = useState<Office[]>([]);

  useEffect(() => { fetchOffices().then(setOffices).catch(() => {}); }, []);

  // Supports deep-linking straight into the Add Lead form, e.g. from the
  // dashboard's "Add Lead" button (/leads?new=1).
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditingLead(null);
      setFormOpen(true);
      router.replace("/leads");
    }
  }, [searchParams, router]);

  // Supports deep-linking straight into a lead's detail view, e.g. from
  // Global Search (/leads?view=<id>).
  useEffect(() => {
    const viewId = searchParams.get("view");
    if (!viewId || leads.length === 0) return;
    const match = leads.find((l) => l.id === viewId);
    if (match) setViewingLead(match);
    router.replace("/leads");
  }, [searchParams, leads, router]);

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

  const exportRows = useMemo(() => filtered.map((l) => ({
    "Name":               l.name,
    "Phone":              l.phone,
    "Destination":        l.destination,
    "Email":              l.email ?? "",
    "Alternate Phone":    l.alternatePhone ?? "",
    "Trip Type":          l.tripType ?? "",
    "Travel Date":        l.travelDate ?? "",
    "Return Date":        l.returnDate ?? "",
    "Duration (Nights)":  l.duration ?? "",
    "Pax":                l.pax ?? "",
    "Budget":             l.budget ?? "",
    "Stage":              l.stage,
    "Priority":           l.priority,
    "Source":             l.source ?? "",
    "Assigned To":        l.assignedTo ?? "",
    "Agent Name":         l.agentName ?? "",
    "Office":             l.officeName,
    "Notes":              l.notes ?? "",
  })), [filtered]);

  function onParseLeadRow(raw: Record<string, string>): { data: LeadFormData } | { error: string } {
    const office = resolveOffice(raw["Office"], offices, {
      officeId:   user?.officeId   ?? "",
      officeName: user?.officeName ?? "",
    });

    // NOTE: `assignedTo` now identifies a real Employee.id (see SalesAgentSelect),
    // not free text. The CSV "Assigned To" column below is passed through as-is —
    // resolving an employee name/email in the sheet to a Firestore doc id is out
    // of scope here, so bulk-imported rows should put the exact employee id in
    // that column (or leave it blank and assign via the edit form afterwards).
    const candidate = {
      name:           raw["Name"]?.trim() ?? "",
      email:          raw["Email"]?.trim() ?? "",
      phone:          raw["Phone"]?.trim() ?? "",
      alternatePhone: raw["Alternate Phone"]?.trim() ?? "",
      destination:    raw["Destination"]?.trim() ?? "",
      tripType:       raw["Trip Type"]?.trim() ?? "",
      travelDate:     raw["Travel Date"]?.trim() ?? "",
      returnDate:     raw["Return Date"]?.trim() ?? "",
      duration:       raw["Duration (Nights)"]?.trim() || undefined,
      pax:            raw["Pax"]?.trim() || undefined,
      budget:         raw["Budget"]?.trim() || undefined,
      stage:          raw["Stage"]?.trim() || "new",
      priority:       raw["Priority"]?.trim() || "warm",
      source:         raw["Source"]?.trim() ?? "",
      assignedTo:     raw["Assigned To"]?.trim() ?? "",
      agentName:      raw["Agent Name"]?.trim() ?? "",
      officeId:       office.officeId,
      officeName:     office.officeName,
      notes:          raw["Notes"]?.trim() ?? "",
    };

    const check = leadSchema.safeParse(candidate);
    if (!check.success) return { error: check.error.issues[0]?.message ?? "Invalid row" };

    const d = check.data;
    const data: LeadFormData = {
      name:            d.name,
      email:           d.email || null,
      phone:           d.phone,
      alternatePhone:  d.alternatePhone || null,
      destination:     d.destination,
      tripType:        d.tripType || null,
      travelDate:      d.travelDate || null,
      returnDate:      d.returnDate || null,
      duration:        d.duration ?? null,
      pax:             d.pax ?? null,
      budget:          d.budget ?? null,
      stage:           d.stage || "new",
      priority:        d.priority || "warm",
      source:          d.source || null,
      assignedTo:      d.assignedTo || null,
      agentName:       d.agentName || null,
      officeId:        d.officeId,
      officeName:      d.officeName,
      notes:           d.notes || null,
      lastContactedAt: null,
      createdBy:       user?.uid ?? "",
    };
    return { data };
  }

  async function onImportLeads(rows: LeadFormData[]): Promise<{ created: number; failed: number }> {
    let created = 0, failed = 0;
    for (const row of rows) {
      const { error } = await addLead(row);
      if (error) failed++; else created++;
    }
    return { created, failed };
  }

  async function handleSubmit(data: LeadSchema) {
    const { referralCodeEntered, ...rest } = data;
    const referredByCustomer = referralCodeEntered
      ? await findCustomerByReferralCode(referralCodeEntered).catch(() => null)
      : null;

    const payload = {
      ...rest,
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
      // The referral-code field is create-only (hidden on edit), so on an
      // edit this always resolves to null above — fall back to whatever
      // was already on the lead instead of silently wiping it out.
      referredByCustomerId: referredByCustomer?.id ?? editingLead?.referredByCustomerId ?? null,
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
        tourId="tour-leads-header"
        description={`${leads.length} total lead${leads.length !== 1 ? "s" : ""} in your pipeline`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setImportOpen(true)} data-tour-id="tour-leads-import">
              Import
            </Button>
            <BulkExportButton filenameBase="leads" rows={exportRows} />
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => { setEditingLead(null); setFormOpen(true); }}
              data-tour-id="tour-leads-add"
            >
              Add Lead
            </Button>
          </>
        }
      />

      <PullToRefresh onRefresh={load}>
        <div className="space-y-5">

          {/* Stage filter tabs */}
          <div data-tour-id="tour-leads-filters" className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
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

        </div>
      </PullToRefresh>

      {/* Detail popup */}
      <LeadDetailModal
        lead={viewingLead ? filtered.find(l => l.id === viewingLead.id) ?? viewingLead : null}
        onClose={() => setViewingLead(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStage={(lead, stage) => changeStage(lead.id, stage)}
        onGenerateLink={generateLink}
      />

      {/* Form drawer */}
      <LeadForm
        open={formOpen}
        lead={editingLead}
        onClose={() => { setFormOpen(false); setEditingLead(null); }}
        onSubmit={handleSubmit}
      />

      {/* Bulk import */}
      <BulkImportModal<LeadFormData>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Leads"
        templateColumns={LEAD_TEMPLATE_COLUMNS}
        onParseRow={onParseLeadRow}
        onImport={onImportLeads}
      />

    </div>
  );
}
