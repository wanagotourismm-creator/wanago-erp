"use client";

import { useOffices } from "@/modules/admin/offices/hooks/useOffices";
import type { CockpitFilters as CockpitFiltersType } from "@/modules/dashboard/types";

const inputClass =
  "rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

function toInputDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function CockpitFilters({
  filters,
  onChange,
}: {
  filters: CockpitFiltersType;
  onChange: (next: CockpitFiltersType) => void;
}) {
  const { offices, loading: officesLoading } = useOffices();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={inputClass}
        value={filters.officeId}
        onChange={(e) => onChange({ ...filters, officeId: e.target.value })}
        disabled={officesLoading}
      >
        <option value="all">All offices</option>
        {offices.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>

      <input
        type="date"
        className={inputClass}
        value={toInputDate(filters.rangeStart)}
        max={toInputDate(filters.rangeEnd)}
        onChange={(e) => {
          if (!e.target.value) return;
          onChange({ ...filters, rangeStart: new Date(e.target.value) });
        }}
      />
      <span className="text-xs text-muted-foreground">to</span>
      <input
        type="date"
        className={inputClass}
        value={toInputDate(filters.rangeEnd)}
        min={toInputDate(filters.rangeStart)}
        onChange={(e) => {
          if (!e.target.value) return;
          onChange({ ...filters, rangeEnd: new Date(e.target.value) });
        }}
      />
    </div>
  );
}
