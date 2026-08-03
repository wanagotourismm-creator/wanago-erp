"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Search, Route as RouteIcon } from "lucide-react";
import { useTourOperations } from "@/modules/tour-operations/hooks/useTourOperations";
import { OperationsStatusBadge } from "@/modules/tour-operations/components/OperationsStatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { OPERATIONS_STAGE_LABELS, type OperationsStage } from "@/lib/constants";
import { toDate } from "@/lib/utils/helpers";

const STATUS_FILTERS: { value: OperationsStage | ""; label: string }[] = [
  { value: "", label: "All" },
  ...(Object.entries(OPERATIONS_STAGE_LABELS) as [OperationsStage, string][]).map(([value, label]) => ({ value, label })),
];

export function TourOperationsPage() {
  const { records, loading, load } = useTourOperations();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<OperationsStage | "">("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchStatus = !statusFilter || r.status === statusFilter;
      const matchSearch = !search || [r.customerName, r.destination, r.refNumber]
        .some((f) => f?.toLowerCase().includes(search.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [records, statusFilter, search]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tour Operations"
        description={`${records.length} confirmed booking${records.length !== 1 ? "s" : ""} in the operations pipeline`}
        actions={
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
            Refresh
          </Button>
        }
      />

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              statusFilter === f.value
                ? "bg-primary text-white shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by customer, destination, ref..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<RouteIcon size={22} />}
          title="No tour operations records yet"
          description="These are created from a confirmed booking — open a confirmed booking and click 'Open Tour Operations' to start one."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/operations/${r.id}`)}
                  className="cursor-pointer border-t border-border hover:bg-muted/40"
                >
                  <td className="px-4 py-3 font-medium text-foreground">{r.refNumber}</td>
                  <td className="px-4 py-3 text-foreground">{r.customerName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.destination}</td>
                  <td className="px-4 py-3"><OperationsStatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{toDate(r.updatedAt)?.toLocaleDateString() ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
