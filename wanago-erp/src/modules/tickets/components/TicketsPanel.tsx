"use client";

import { useMemo, useState, useEffect } from "react";
import { Ticket as TicketIcon, RefreshCw, Clock, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import { useTickets } from "@/modules/tickets/hooks/useTickets";
import { TicketsTable } from "@/modules/tickets/components/TicketsTable";
import { TicketDetailModal } from "@/modules/tickets/components/TicketDetailModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/helpers";
import { BulkImportModal, type TemplateColumn, type ParseRowResult } from "@/components/bulk/BulkImportModal";
import { BulkExportButton } from "@/components/bulk/BulkExportButton";
import { resolveOffice } from "@/lib/bulk/resolveOffice";
import { useAuthStore } from "@/store/auth.store";
import { ticketSchema } from "@/modules/tickets/schemas";
import { createTicket } from "@/modules/tickets/services/ticket.service";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import type { Employee } from "@/modules/hrms/shared/types";
import type { Office } from "@/modules/admin/offices/types";
import type { Ticket } from "@/modules/tickets/types";
import type { TicketSchema } from "@/modules/tickets/schemas";

const STATUS_FILTERS = ["All", "Open", "In Progress", "Resolved", "Closed"];

const TEMPLATE_COLUMNS: TemplateColumn[] = [
  { key: "title",       label: "Title",       required: true, example: "Laptop won't turn on" },
  { key: "description", label: "Description", required: true, example: "Screen stays black on power" },
  { key: "category",    label: "Category",    required: true, example: "Hardware" },
  { key: "priority",    label: "Priority",    example: "medium" },
  { key: "reportedBy",  label: "Reported By", required: true, example: "EMP-0001 or Jane Doe" },
  { key: "office",      label: "Office",      example: "Head Office" },
];

// Matches a free-text "Reported By" column value against employeeCode first,
// then fullName (case-insensitive) — the one cross-reference this module
// needs resolved from a human-readable spreadsheet cell.
function resolveEmployeeRef(value: string | undefined, employees: Employee[]): { id: string; fullName: string } | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const byCode = employees.find((e) => e.employeeCode.toLowerCase() === lower);
  if (byCode) return { id: byCode.id, fullName: byCode.fullName };
  const byName = employees.find((e) => e.fullName.toLowerCase() === lower);
  if (byName) return { id: byName.id, fullName: byName.fullName };
  return null;
}

export function TicketsPanel() {
  const { tickets, loading, stats, load, setStatus, assignToMe, removeTicket } = useTickets();
  const { user } = useAuthStore();
  const canDelete = user?.systemRole === "admin" || user?.systemRole === "super_admin";
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewingTicket, setViewingTicket] = useState<Ticket | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);

  useEffect(() => {
    fetchEmployees().then(setEmployees);
    fetchOffices().then(setOffices);
  }, []);

  function handleDelete(t: Ticket) {
    if (!confirm(`Delete ticket "${t.title}"?`)) return;
    setViewingTicket(null);
    removeTicket(t.id);
  }

  const filtered = useMemo(() => tickets.filter((t) => {
    if (statusFilter === "All") return true;
    return t.ticketStatus === statusFilter.toLowerCase().replace(" ", "_");
  }), [tickets, statusFilter]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tickets) counts[t.category] = (counts[t.category] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [tickets]);

  function onParseRow(raw: Record<string, string>): ParseRowResult<TicketSchema> {
    const reporterValue = raw["Reported By"];
    const empRef = resolveEmployeeRef(reporterValue, employees);
    if (!empRef) {
      return { error: `Employee '${reporterValue ?? ""}' not found — check the code or name matches exactly` };
    }

    const office = resolveOffice(raw["Office"], offices, {
      officeId:   user?.officeId   ?? "",
      officeName: user?.officeName ?? "",
    });

    const rawPriority = raw["Priority"]?.trim().toLowerCase();

    const candidate = {
      title:          raw["Title"]?.trim() ?? "",
      description:    raw["Description"]?.trim() ?? "",
      category:       raw["Category"]?.trim() ?? "",
      priority:       (["low", "medium", "high", "urgent"].includes(rawPriority ?? "") ? rawPriority : "medium") as TicketSchema["priority"],
      reportedById:   empRef.id,
      reportedByName: empRef.fullName,
      officeId:       office.officeId,
    };

    const result = ticketSchema.safeParse(candidate);
    if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid row" };
    return { data: result.data };
  }

  async function onImport(rows: TicketSchema[]): Promise<{ created: number; failed: number }> {
    let created = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        await createTicket(row, user?.uid ?? "");
        created++;
      } catch {
        failed++;
      }
    }
    await load();
    return { created, failed };
  }

  const exportRows = tickets.map((t) => ({
    RefNumber:      t.refNumber,
    Title:          t.title,
    Category:       t.category,
    Priority:       t.priority,
    Status:         t.ticketStatus,
    ReportedBy:     t.reportedByName,
    AssignedTo:     t.assignedToName ?? "",
    Office:         offices.find((o) => o.id === t.officeId)?.name ?? t.officeId,
  }));

  return (
    <div className="space-y-5">
      <PageHeader title="IT Support" description={`${stats.total} tickets reported`}
        actions={<>
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={load}>Refresh</Button>
          <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setImportOpen(true)}>Import</Button>
          <BulkExportButton filenameBase="tickets" rows={exportRows} />
        </>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Open", value: stats.open, icon: AlertCircle, color: "text-blue-600" },
          { label: "In Progress", value: stats.inProgress, icon: Clock, color: "text-amber-600" },
          { label: "Resolved / Closed", value: stats.resolved, icon: CheckCircle2, color: "text-green-600" },
          { label: "Total", value: stats.total, icon: TicketIcon, color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <s.icon size={18} className="text-primary" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {categoryCounts.length > 0 && (
        <div className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-foreground mb-3">By Category</p>
          <div className="flex flex-wrap gap-2">
            {categoryCounts.map(([category, count]) => (
              <span key={category} className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground">
                {category} <span className="text-primary font-bold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {STATUS_FILTERS.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn("flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
              statusFilter === s ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40")}>
            {s}
          </button>
        ))}
      </div>

      <TicketsTable
        tickets={filtered}
        loading={loading}
        canDelete={canDelete}
        onView={setViewingTicket}
        onSetStatus={(t, status) => setStatus(t.id, status)}
        onAssignToMe={(t) => assignToMe(t.id)}
        onDelete={handleDelete}
      />

      <TicketDetailModal
        ticket={viewingTicket ? filtered.find(t => t.id === viewingTicket.id) ?? viewingTicket : null}
        canDelete={canDelete}
        onClose={() => setViewingTicket(null)}
        onSetStatus={(t, status) => setStatus(t.id, status)}
        onAssignToMe={(t) => assignToMe(t.id)}
        onDelete={handleDelete}
      />

      <BulkImportModal<TicketSchema>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Tickets"
        description="Upload a .csv or .xlsx file to create many IT support tickets at once"
        templateColumns={TEMPLATE_COLUMNS}
        onParseRow={(raw) => onParseRow(raw)}
        onImport={onImport}
      />
    </div>
  );
}
