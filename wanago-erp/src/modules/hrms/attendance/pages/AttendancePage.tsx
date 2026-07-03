"use client";

import { useState, useMemo } from "react";
import { Plus, RefreshCw, Clock, UserCheck, UserX, CalendarOff } from "lucide-react";
import { useAttendance } from "@/modules/hrms/attendance/hooks/useAttendance";
import { AttendanceTable } from "@/modules/hrms/attendance/components/AttendanceTable";
import { AttendanceForm } from "@/modules/hrms/attendance/components/AttendanceForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/helpers";
import type { AttendanceRecord } from "@/modules/hrms/shared/types";
import type { AttendanceRecordSchema } from "@/modules/hrms/attendance/schemas";

const STATUS_FILTERS = ["All", "Present", "Absent", "Half_day", "Leave", "Wfh", "Holiday"];

export function AttendancePage() {
  const { records, loading, stats, addAttendance, editAttendance, removeAttendance, load } = useAttendance();

  const [formOpen, setFormOpen] = useState(false);
  const [editing,  setEditing]  = useState<AttendanceRecord | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = useMemo(() => records.filter(r =>
    statusFilter === "All" || r.status === statusFilter.toLowerCase()
  ), [records, statusFilter]);

  async function handleSubmit(data: AttendanceRecordSchema) {
    setFormError(null);
    const result = editing ? await editAttendance(editing.id, data) : await addAttendance(data);
    if (result.error) { setFormError(result.error); return; }
    setFormOpen(false); setEditing(null);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Attendance" description={`${records.length} total attendance records`}
        actions={<>
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={load}>Refresh</Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditing(null); setFormError(null); setFormOpen(true); }}>Mark Attendance</Button>
        </>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Records", value: stats.total,   icon: Clock,      color: "text-primary"   },
          { label: "Present",       value: stats.present, icon: UserCheck,  color: "text-green-600" },
          { label: "Absent",        value: stats.absent,  icon: UserX,      color: "text-red-600"   },
          { label: "Leave / WFH",   value: stats.onLeave, icon: CalendarOff, color: "text-amber-600" },
        ].map(s => (
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

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn("flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
              statusFilter === s ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40")}>
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <AttendanceTable records={filtered} loading={loading}
        onEdit={r => { setEditing(r); setFormError(null); setFormOpen(true); }}
        onDelete={async r => { if (confirm(`Delete attendance record for "${r.employeeName}"?`)) await removeAttendance(r.id); }} />

      <AttendanceForm open={formOpen} record={editing} error={formError}
        onClose={() => { setFormOpen(false); setEditing(null); setFormError(null); }}
        onSubmit={handleSubmit} />
    </div>
  );
}
