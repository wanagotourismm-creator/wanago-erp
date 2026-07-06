"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, CalendarDays, Loader2, Sparkles } from "lucide-react";
import { useHolidays } from "@/modules/admin/holidays/hooks/useHolidays";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate, cn } from "@/lib/utils/helpers";
import { useAuthStore } from "@/store/auth.store";
import type { Office } from "@/modules/admin/offices/types";

// National holidays are fixed-date and certain. Festival dates follow the
// lunar/Islamic calendars and are best-effort estimates for 2026 — verify
// against an official calendar before relying on them for payroll/leave
// deductions, and edit/delete any entry below once added if it's off by a
// day for your region.
const INDIA_HOLIDAYS_2026: { name: string; date: string }[] = [
  { name: "New Year's Day",              date: "2026-01-01" },
  { name: "Makar Sankranti / Pongal",    date: "2026-01-14" },
  { name: "Republic Day",                date: "2026-01-26" },
  { name: "Maha Shivratri",              date: "2026-02-15" },
  { name: "Holi",                        date: "2026-03-04" },
  { name: "Ugadi / Gudi Padwa",          date: "2026-03-19" },
  { name: "Eid-ul-Fitr",                 date: "2026-03-20" },
  { name: "Ram Navami",                  date: "2026-03-27" },
  { name: "Mahavir Jayanti",             date: "2026-03-31" },
  { name: "Good Friday",                 date: "2026-04-03" },
  { name: "Eid-ul-Adha (Bakrid)",        date: "2026-05-27" },
  { name: "Buddha Purnima",              date: "2026-05-31" },
  { name: "Muharram",                    date: "2026-06-16" },
  { name: "Independence Day",            date: "2026-08-15" },
  { name: "Milad-un-Nabi",               date: "2026-08-25" },
  { name: "Raksha Bandhan",              date: "2026-08-28" },
  { name: "Janmashtami",                 date: "2026-09-04" },
  { name: "Ganesh Chaturthi",            date: "2026-09-14" },
  { name: "Gandhi Jayanti",              date: "2026-10-02" },
  { name: "Dussehra (Vijayadashami)",    date: "2026-10-20" },
  { name: "Diwali (Deepavali)",          date: "2026-11-08" },
  { name: "Bhai Dooj",                   date: "2026-11-10" },
  { name: "Guru Nanak Jayanti",          date: "2026-11-24" },
  { name: "Christmas",                   date: "2026-12-25" },
];

const inputClass = cn(
  "rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-all",
  "hover:border-primary/40 focus:border-primary"
);

export function HolidayCalendar() {
  const { holidays, loading, addHoliday, removeHoliday } = useHolidays();
  const { user } = useAuthStore();
  const [offices, setOffices] = useState<Office[]>([]);
  const [name,     setName]     = useState("");
  const [date,     setDate]     = useState("");
  const [officeId, setOfficeId] = useState("");
  const [adding,   setAdding]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  useEffect(() => {
    fetchOffices().then(setOffices).catch(() => {});
  }, []);

  async function handleAdd() {
    if (!name || !date) { setError("Name and date are required."); return; }
    setError(null);
    setAdding(true);
    try {
      const office = offices.find(o => o.id === officeId);
      const result = await addHoliday({
        name, date,
        officeId: office?.id ?? null,
        createdBy: user?.uid ?? "",
      });
      if (result.error) { setError(result.error); return; }
      setName(""); setDate(""); setOfficeId("");
    } finally {
      setAdding(false);
    }
  }

  async function handleAddIndianHolidays() {
    setBulkAdding(true);
    setBulkResult(null);
    try {
      const existingDates = new Set(holidays.map(h => h.date));
      const toAdd = INDIA_HOLIDAYS_2026.filter(h => !existingDates.has(h.date));
      for (const h of toAdd) {
        await addHoliday({ name: h.name, date: h.date, officeId: null, createdBy: user?.uid ?? "" });
      }
      const skipped = INDIA_HOLIDAYS_2026.length - toAdd.length;
      setBulkResult(
        `Added ${toAdd.length} holiday${toAdd.length === 1 ? "" : "s"}` +
        (skipped > 0 ? `, skipped ${skipped} already on the calendar.` : ".")
      );
    } finally {
      setBulkAdding(false);
    }
  }

  async function handleDelete(id: string, holidayName: string) {
    if (!confirm(`Delete holiday "${holidayName}"?`)) return;
    await removeHoliday(id);
  }

  const upcoming = holidays.filter(h => h.date >= new Date().toISOString().slice(0, 10));
  const past     = holidays.filter(h => h.date < new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className="text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Add Holiday</p>
          </div>
          <button
            onClick={handleAddIndianHolidays}
            disabled={bulkAdding}
            title="Adds national holidays and major festivals for 2026 — festival dates are best-effort estimates, verify before relying on them for payroll"
            className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-60 transition-colors"
          >
            {bulkAdding ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Add Indian Holidays 2026
          </button>
        </div>
        {bulkResult && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">{bulkResult}</div>
        )}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Name</label>
            <input className={inputClass} placeholder="e.g. Diwali" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Date</label>
            <input className={inputClass} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Office</label>
            <select className={inputClass} value={officeId} onChange={e => setOfficeId(e.target.value)}>
              <option value="">All offices</option>
              {offices.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAdd}
            disabled={adding}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add
          </button>
        </div>
      </div>

      {loading ? <SkeletonTable rows={5} /> : holidays.length === 0 ? (
        <EmptyState title="No holidays added yet" description="Add your company holidays above" icon={<span className="text-2xl">🎉</span>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[{ label: "Upcoming", items: upcoming }, { label: "Past", items: past }].map(section => (
            section.items.length > 0 && (
              <div key={section.label} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <p className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/30">{section.label}</p>
                <div className="divide-y divide-border">
                  {section.items.map(h => (
                    <div key={h.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-foreground">{h.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(h.date)} {h.officeId ? "" : "· All offices"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(h.id, h.name)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
