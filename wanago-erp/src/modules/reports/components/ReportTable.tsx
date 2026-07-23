"use client";

import { Download, FileText, Search } from "lucide-react";
import { DEPARTMENTS } from "@/modules/hrms/employees/components/EmployeeBadges";
import { exportToCsv } from "@/lib/csv-export";
import { exportTableToPdf } from "@/lib/pdf-export";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import type { ReportRow } from "@/modules/reports/types";

type Props = {
  reportKey: string;
  label: string;
  hasDepartment: boolean;
  loading: boolean;
  columns: string[];
  filtered: ReportRow[];
  department: string;
  setDepartment: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
};

// The generic filter/search/CSV/PDF-export table shared by every raw-table
// report tab — extracted as-is from the old monolithic ReportsPage.tsx.
export function ReportTable({
  reportKey, label, hasDepartment, loading, columns, filtered,
  department, setDepartment, search, setSearch,
}: Props) {
  function handleExportCsv() {
    if (filtered.length === 0) return;
    exportToCsv(`${reportKey}-report.csv`, filtered);
  }

  async function handleExportPdf() {
    if (filtered.length === 0) return;
    await exportTableToPdf(
      label,
      columns,
      filtered.map(row => columns.map(c => row[c] ?? "—")),
      `${reportKey}-report.pdf`
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        {hasDepartment && (
          <select value={department} onChange={e => setDepartment(e.target.value)}
            className="rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none hover:border-primary/40 focus:border-primary">
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleExportCsv} disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors disabled:opacity-50">
            <Download size={13} /> CSV / Excel
          </button>
          <button onClick={handleExportPdf} disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors disabled:opacity-50">
            <FileText size={13} /> PDF
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={8} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No data found" description="Try a different report type or filter" icon={<span className="text-2xl">📊</span>} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {columns.map(c => (
                    <th key={c} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.slice(0, 200).map((row, i) => (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    {columns.map(c => (
                      <td key={c} className="px-4 py-2.5 text-xs text-foreground whitespace-nowrap">{row[c] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > 200 && (
            <p className="px-4 py-2 text-[11px] text-muted-foreground border-t border-border">
              Showing first 200 of {filtered.length} rows — export to see all
            </p>
          )}
        </div>
      )}
    </>
  );
}
