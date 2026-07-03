"use client";

import { useState, useMemo } from "react";
import { Plus, Search, RefreshCw, Users, UserCheck, Clock, Building } from "lucide-react";
import { useEmployees } from "@/modules/hrms/employees/hooks/useEmployees";
import { EmployeeTable } from "@/modules/hrms/employees/components/EmployeeTable";
import { EmployeeForm } from "@/modules/hrms/employees/components/EmployeeForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";
import type { Employee } from "@/modules/hrms/shared/types";
import type { EmployeeSchema } from "@/modules/hrms/employees/schemas";

const DEPT_FILTERS = ["All","Sales","Operations","Finance","Marketing","HR","Management","Support"];

export function EmployeesPage() {
  const { employees, loading, stats, addEmployee, editEmployee, removeEmployee, load } = useEmployees();
  const { user } = useAuthStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editing,  setEditing]  = useState<Employee | null>(null);
  const [search,   setSearch]   = useState("");
  const [deptFilter, setDeptFilter] = useState("All");

  const filtered = useMemo(() => employees.filter(e => {
    const mD = deptFilter === "All" || e.department === deptFilter;
    const mS = !search || [e.fullName, e.email, e.phone, e.department, e.designation, e.employeeId]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()));
    return mD && mS;
  }), [employees, deptFilter, search]);

  async function handleSubmit(data: EmployeeSchema) {
    if (editing) await editEmployee(editing.id, data);
    else await addEmployee({ ...data, officeId: user?.officeId ?? "main", officeName: user?.officeName ?? "Head Office" });
    setFormOpen(false); setEditing(null);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Employees" description={`${employees.length} total employees`}
        actions={<>
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={load}>Refresh</Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditing(null); setFormOpen(true); }}>Add Employee</Button>
        </>} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label:"Total Employees", value:stats.total,       icon:Users,      color:"text-blue-600"  },
          { label:"Active",          value:stats.active,      icon:UserCheck,  color:"text-green-600" },
          { label:"On Leave",        value:stats.onLeave,     icon:Clock,      color:"text-amber-600" },
          { label:"Departments",     value:stats.departments, icon:Building,   color:"text-primary"   },
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

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin flex-1">
          {DEPT_FILTERS.map(d => (
            <button key={d} onClick={() => setDeptFilter(d)}
              className={cn("flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                deptFilter === d ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40")}>
              {d}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>

      <EmployeeTable employees={filtered} loading={loading}
        onEdit={e => { setEditing(e); setFormOpen(true); }}
        onDelete={async e => { if (confirm(`Delete employee "${e.fullName}"?`)) await removeEmployee(e.id); }} />

      <EmployeeForm open={formOpen} employee={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit} />
    </div>
  );
}
