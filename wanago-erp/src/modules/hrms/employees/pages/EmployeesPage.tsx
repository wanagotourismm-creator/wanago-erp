"use client";

import { useState, useMemo } from "react";
import { Plus, Search, RefreshCw, Users, UserCheck, UserX, Clock } from "lucide-react";
import { useEmployees } from "@/modules/hrms/employees/hooks/useEmployees";
import { EmployeeDirectory } from "@/modules/hrms/employees/components/EmployeeDirectory";
import { EmployeeForm } from "@/modules/hrms/employees/components/EmployeeForm";
import { EmployeeProfile } from "@/modules/hrms/employees/components/EmployeeProfile";
import { DEPARTMENTS } from "@/modules/hrms/employees/components/EmployeeBadges";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils/helpers";
import type { Employee } from "@/modules/hrms/shared/types";
import type { EmployeeSchema } from "@/modules/hrms/employees/schemas";

export function EmployeesPage() {
  const { employees, loading, addEmployee, editEmployee, removeEmployee, load } = useEmployees();
  const { user } = useAuthStore();
  const canManage = !!user && hasPermission(user.systemRole, "hrms:manage");

  const [formOpen,        setFormOpen]        = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [profileEmployee, setProfileEmployee] = useState<Employee | null>(null);
  const [deptFilter,       setDeptFilter]      = useState("");
  const [search,           setSearch]          = useState("");

  const filtered = useMemo(() => {
    return employees.filter(e => {
      const matchDept   = !deptFilter || e.department === deptFilter;
      const matchSearch = !search || [e.fullName, e.employeeCode, e.designation, e.mobileNumber]
        .some(f => f?.toLowerCase().includes(search.toLowerCase()));
      return matchDept && matchSearch;
    });
  }, [employees, deptFilter, search]);

  const stats = useMemo(() => ({
    total:      employees.length,
    active:     employees.filter(e => e.employeeStatus === "active").length,
    probation:  employees.filter(e => e.probationStatus === "probation").length,
    inactive:   employees.filter(e => e.employeeStatus !== "active").length,
  }), [employees]);

  async function handleSubmit(data: EmployeeSchema) {
    const manager = employees.find(e => e.id === data.reportingManagerId);
    const payload = {
      ...data,
      gender:             data.gender || null,
      dateOfBirth:        data.dateOfBirth || null,
      email:              data.email || null,
      address:            data.address || null,
      reportingManagerId: data.reportingManagerId || null,
      reportingManagerName: manager?.fullName ?? null,
      dateOfJoining:      data.dateOfJoining || null,
      bankAccountNumber:  data.bankAccountNumber || null,
      bankName:           data.bankName || null,
      ifscCode:           data.ifscCode || null,
      uan:                data.uan || null,
      pfNumber:           data.pfNumber || null,
      panNumber:          data.panNumber || null,
      createdBy:          user?.uid ?? "",
    };

    if (editingEmployee) await editEmployee(editingEmployee.id, payload);
    else await addEmployee(payload);
    setFormOpen(false);
    setEditingEmployee(null);
  }

  async function handleDelete(employee: Employee) {
    if (!confirm(`Delete employee "${employee.fullName}"? This cannot be undone.`)) return;
    await removeEmployee(employee.id);
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Employees"
        description={`${employees.length} employee${employees.length !== 1 ? "s" : ""} in your directory`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            {canManage && (
              <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditingEmployee(null); setFormOpen(true); }}>
                Add Employee
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Employees", value: stats.total,     icon: Users,    color: "text-primary"   },
          { label: "Active",          value: stats.active,     icon: UserCheck, color: "text-green-600" },
          { label: "On Probation",    value: stats.probation,  icon: Clock,    color: "text-amber-600" },
          { label: "Inactive",        value: stats.inactive,   icon: UserX,    color: "text-red-600"   },
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
        {["", ...DEPARTMENTS].map(d => (
          <button key={d || "all"} onClick={() => setDeptFilter(d)}
            className={cn(
              "flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
              deptFilter === d ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            )}>
            {d || "All Departments"}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name, code, designation, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <EmployeeDirectory
        employees={filtered}
        loading={loading}
        canManage={canManage}
        onView={setProfileEmployee}
        onEdit={(e) => { setEditingEmployee(e); setFormOpen(true); }}
        onDelete={handleDelete}
      />

      <EmployeeForm
        open={formOpen}
        employee={editingEmployee}
        employees={employees}
        onClose={() => { setFormOpen(false); setEditingEmployee(null); }}
        onSubmit={handleSubmit}
      />

      <EmployeeProfile
        open={!!profileEmployee}
        employee={profileEmployee}
        onClose={() => setProfileEmployee(null)}
        onUpdated={(updated) => {
          setProfileEmployee(updated);
          load();
        }}
      />

    </div>
  );
}
