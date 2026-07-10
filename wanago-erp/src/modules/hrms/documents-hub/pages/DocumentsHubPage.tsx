"use client";

import { useMemo, useState } from "react";
import { Search, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDate } from "@/lib/utils/helpers";
import { useDocumentsHub } from "@/modules/hrms/documents-hub/hooks/useDocumentsHub";

export function DocumentsHubPage() {
  const { rows, loading, error } = useDocumentsHub();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.employeeName.toLowerCase().includes(q) || r.label.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="space-y-5">
      <PageHeader title="Documents" description="All employee documents in one place" />

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by employee or document..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-muted-foreground/60 hover:border-primary/40 focus:border-primary"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No documents uploaded yet.</p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No documents match your search.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Employee", "Department", "Document", "Uploaded", ""].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((row) => (
                  <tr key={row.docId} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{row.employeeName}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{row.department || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-foreground">
                        <FileText size={13} className="flex-shrink-0 text-muted-foreground" />
                        {row.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(row.uploadedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
