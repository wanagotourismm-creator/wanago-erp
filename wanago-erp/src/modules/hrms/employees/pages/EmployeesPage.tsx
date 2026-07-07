"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, RefreshCw, Users, UserCheck, UserX, Clock, Upload, Mail, Loader2 } from "lucide-react";
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
import { BulkImportModal, type TemplateColumn } from "@/components/bulk/BulkImportModal";
import { BulkExportButton } from "@/components/bulk/BulkExportButton";
import { resolveOffice } from "@/lib/bulk/resolveOffice";
import { createEmployee } from "@/modules/hrms/employees/services/employee.service";
import { employeeSchema } from "@/modules/hrms/employees/schemas";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import type { Office } from "@/modules/admin/offices/types";
import type { Employee } from "@/modules/hrms/shared/types";
import type { EmployeeFormData } from "@/modules/hrms/employees/types";
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
  const [importOpen,       setImportOpen]      = useState(false);
  const [offices,          setOffices]         = useState<Office[]>([]);
  const [sendingWelcome,   setSendingWelcome]  = useState(false);

  useEffect(() => { fetchOffices().then(setOffices).catch(() => {}); }, []);

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

  async function handleSendWelcomeToAll() {
    const recipients = employees.filter(e => e.email);
    const skipped = employees.length - recipients.length;
    if (recipients.length === 0) {
      alert("No employees have an email on file — nothing to send.");
      return;
    }
    if (!confirm(`Send the "Welcome to Team Wanago" email to all ${recipients.length} employee${recipients.length !== 1 ? "s" : ""} with an email on file?${skipped ? ` (${skipped} skipped — no email on file.)` : ""}`)) {
      return;
    }

    setSendingWelcome(true);
    let sent = 0, failed = 0;
    for (const employee of recipients) {
      try {
        const res = await fetch("/api/hrms/send-welcome-email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ to: employee.email, fullName: employee.fullName, designation: employee.designation }),
        });
        if (res.ok) sent++; else failed++;
      } catch {
        failed++;
      }
    }
    setSendingWelcome(false);
    alert(`Sent ${sent} welcome email${sent !== 1 ? "s" : ""}.${failed ? ` ${failed} failed.` : ""}${skipped ? ` ${skipped} skipped (no email on file).` : ""}`);
  }

  const exportRows = useMemo(() => filtered.map((e) => ({
    "Full Name":            e.fullName,
    Gender:                 e.gender ?? "",
    "Date of Birth":        e.dateOfBirth ?? "",
    "Mobile Number":        e.mobileNumber,
    Email:                  e.email ?? "",
    Address:                e.address ?? "",
    Department:             e.department,
    Designation:            e.designation,
    "Reporting Manager":    e.reportingManagerName ?? "",
    "Employment Type":      e.employmentType,
    "Date of Joining":      e.dateOfJoining ?? "",
    "Probation Status":     e.probationStatus,
    "Employee Status":      e.employeeStatus,
    "Basic Salary":         e.basicSalary,
    HRA:                    e.hra,
    Allowances:             e.allowances,
    "Bank Account Number":  e.bankAccountNumber ?? "",
    "Bank Name":            e.bankName ?? "",
    "IFSC Code":            e.ifscCode ?? "",
    UAN:                    e.uan ?? "",
    "PF Number":            e.pfNumber ?? "",
    "PAN Number":           e.panNumber ?? "",
    Office:                 e.officeName,
  })), [filtered]);

  const templateColumns: TemplateColumn[] = [
    { key: "fullName", label: "Full Name", required: true, example: "Priya Sharma" },
    { key: "gender", label: "Gender", example: "female" },
    { key: "dateOfBirth", label: "Date of Birth", example: "1995-06-15" },
    { key: "mobileNumber", label: "Mobile Number", required: true, example: "9876543210" },
    { key: "email", label: "Email", example: "priya@example.com" },
    { key: "address", label: "Address" },
    { key: "department", label: "Department", required: true, example: "Sales" },
    { key: "designation", label: "Designation", required: true, example: "Executive" },
    { key: "reportingManager", label: "Reporting Manager", example: "EMPLOYEE-0001 or full name" },
    { key: "employmentType", label: "Employment Type", required: true, example: "full_time" },
    { key: "dateOfJoining", label: "Date of Joining", example: "2026-01-01" },
    { key: "probationStatus", label: "Probation Status", required: true, example: "probation" },
    { key: "employeeStatus", label: "Employee Status", required: true, example: "active" },
    { key: "basicSalary", label: "Basic Salary", required: true, example: "30000" },
    { key: "hra", label: "HRA", example: "5000" },
    { key: "allowances", label: "Allowances", example: "2000" },
    { key: "bankAccountNumber", label: "Bank Account Number" },
    { key: "bankName", label: "Bank Name" },
    { key: "ifscCode", label: "IFSC Code" },
    { key: "uan", label: "UAN" },
    { key: "pfNumber", label: "PF Number" },
    { key: "panNumber", label: "PAN Number" },
    { key: "office", label: "Office", example: "Head Office" },
  ];

  // Reporting Manager is matched against employees that exist before the
  // import starts (the `employees` array captured in this closure) — a new
  // hire's manager in the same file is NOT resolved (no two-pass lookup),
  // so blank/unmatched just leaves the row without a manager, same as
  // picking "No manager" in the manual form.
  function onParseRow(raw: Record<string, string>) {
    const office = resolveOffice(raw["Office"], offices, {
      officeId: user?.officeId ?? "",
      officeName: user?.officeName ?? "",
    });

    const managerRaw = raw["Reporting Manager"]?.trim().toLowerCase();
    const manager = managerRaw
      ? employees.find(e =>
          e.employeeCode.toLowerCase() === managerRaw ||
          e.fullName.toLowerCase() === managerRaw
        )
      : undefined;

    const candidate = {
      fullName:            raw["Full Name"] ?? "",
      gender:              (raw["Gender"]?.trim().toLowerCase() || undefined) as EmployeeSchema["gender"],
      dateOfBirth:         raw["Date of Birth"] ?? "",
      mobileNumber:        raw["Mobile Number"] ?? "",
      email:               raw["Email"] ?? "",
      address:             raw["Address"] ?? "",
      department:          raw["Department"] ?? "",
      designation:         raw["Designation"] ?? "",
      reportingManagerId:  manager?.id ?? "",
      employmentType:      (raw["Employment Type"]?.trim() || "") as EmployeeSchema["employmentType"],
      dateOfJoining:       raw["Date of Joining"] ?? "",
      probationStatus:     (raw["Probation Status"]?.trim() || "") as EmployeeSchema["probationStatus"],
      employeeStatus:      (raw["Employee Status"]?.trim() || "") as EmployeeSchema["employeeStatus"],
      basicSalary:         raw["Basic Salary"] ?? "",
      hra:                 raw["HRA"] || "0",
      allowances:          raw["Allowances"] || "0",
      bankAccountNumber:   raw["Bank Account Number"] ?? "",
      bankName:            raw["Bank Name"] ?? "",
      ifscCode:            raw["IFSC Code"] ?? "",
      uan:                 raw["UAN"] ?? "",
      pfNumber:            raw["PF Number"] ?? "",
      panNumber:           raw["PAN Number"] ?? "",
      officeId:            office.officeId,
      officeName:          office.officeName,
      userId:              "",
    };
    const check = employeeSchema.safeParse(candidate);
    if (!check.success) return { error: check.error.issues[0]?.message ?? "Invalid row" };
    return {
      data: {
        ...check.data,
        reportingManagerName: manager?.fullName ?? "",
      } as EmployeeSchema & { reportingManagerName: string },
    };
  }

  async function onImport(rows: (EmployeeSchema & { reportingManagerName: string })[]) {
    let created = 0, failed = 0;
    for (const row of rows) {
      const { reportingManagerName, ...rest } = row;
      const payload: EmployeeFormData = {
        ...rest,
        gender:             rest.gender || null,
        dateOfBirth:        rest.dateOfBirth || null,
        email:              rest.email || null,
        address:            rest.address || null,
        reportingManagerId: rest.reportingManagerId || null,
        reportingManagerName: reportingManagerName || null,
        dateOfJoining:      rest.dateOfJoining || null,
        bankAccountNumber:  rest.bankAccountNumber || null,
        bankName:           rest.bankName || null,
        ifscCode:           rest.ifscCode || null,
        uan:                rest.uan || null,
        pfNumber:           rest.pfNumber || null,
        panNumber:          rest.panNumber || null,
        userId:             null,
        createdBy:          user?.uid ?? "",
      };
      try {
        await createEmployee(payload, user?.uid ?? "");
        created++;
      } catch {
        failed++;
      }
    }
    return { created, failed };
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
              <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setImportOpen(true)}>
                Import
              </Button>
            )}
            <BulkExportButton filenameBase="employees" rows={exportRows} />
            {canManage && (
              <Button
                variant="outline" size="sm"
                icon={sendingWelcome ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                disabled={sendingWelcome}
                onClick={handleSendWelcomeToAll}
              >
                Send Welcome Email to All
              </Button>
            )}
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
        employees={employees}
        onClose={() => setProfileEmployee(null)}
        onUpdated={(updated) => {
          setProfileEmployee(updated);
          load();
        }}
      />

      {/* Bulk import */}
      <BulkImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Employees"
        templateColumns={templateColumns}
        onParseRow={onParseRow}
        onImport={onImport}
      />

    </div>
  );
}
