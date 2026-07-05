"use client";

import { useState, useMemo, useEffect } from "react";
import { Download, FileText, Search } from "lucide-react";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { fetchAttendanceRecords } from "@/modules/hrms/attendance/services/attendance.service";
import { fetchLeaves } from "@/modules/hrms/leaves/services/leave.service";
import { fetchPayrollRecords } from "@/modules/hrms/payroll/services/payroll.service";
import { fetchCandidates } from "@/modules/recruitment/candidates/services/candidate.service";
import { fetchReviews } from "@/modules/performance/reviews/services/review.service";
import { DEPARTMENTS } from "@/modules/hrms/employees/components/EmployeeBadges";
import { MONTH_LABELS } from "@/modules/hrms/payroll/components/PayrollBadges";
import { exportToCsv } from "@/lib/csv-export";
import { exportTableToPdf } from "@/lib/pdf-export";
import { formatDate, cn } from "@/lib/utils/helpers";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";

type ReportKey = "employees" | "attendance" | "leaves" | "payroll" | "recruitment" | "performance";

type ReportRow = Record<string, string | number>;

const REPORT_TYPES: { key: ReportKey; label: string; hasDepartment: boolean }[] = [
  { key: "employees",   label: "Employee Report",    hasDepartment: true  },
  { key: "attendance",  label: "Attendance Report",   hasDepartment: false },
  { key: "leaves",      label: "Leave Report",        hasDepartment: false },
  { key: "payroll",     label: "Payroll Report",      hasDepartment: false },
  { key: "recruitment", label: "Recruitment Report",  hasDepartment: false },
  { key: "performance", label: "Performance Report",  hasDepartment: false },
];

async function loadReportData(key: ReportKey): Promise<{ columns: string[]; rows: ReportRow[]; dateField?: string; deptField?: string }> {
  switch (key) {
    case "employees": {
      const data = await fetchEmployees();
      return {
        columns: ["Code", "Name", "Department", "Designation", "Type", "Status", "Joined", "Mobile", "Email"],
        deptField: "Department",
        rows: data.map(e => ({
          Code: e.employeeCode, Name: e.fullName, Department: e.department, Designation: e.designation,
          Type: e.employmentType, Status: e.employeeStatus, Joined: e.dateOfJoining ? formatDate(e.dateOfJoining) : "—",
          Mobile: e.mobileNumber, Email: e.email ?? "—",
        })),
      };
    }
    case "attendance": {
      const data = await fetchAttendanceRecords();
      return {
        columns: ["Employee", "Date", "Status", "Clock In", "Clock Out", "Hours"],
        dateField: "Date",
        rows: data.map(a => ({
          Employee: a.employeeName, Date: formatDate(a.date), Status: a.status,
          "Clock In": a.clockIn ?? "—", "Clock Out": a.clockOut ?? "—", Hours: a.hoursWorked ?? "—",
        })),
      };
    }
    case "leaves": {
      const data = await fetchLeaves();
      return {
        columns: ["Employee", "Type", "From", "To", "Days", "Status"],
        dateField: "From",
        rows: data.map(l => ({
          Employee: l.employeeName, Type: l.leaveType, From: formatDate(l.fromDate), To: formatDate(l.toDate),
          Days: l.days, Status: l.status,
        })),
      };
    }
    case "payroll": {
      const data = await fetchPayrollRecords();
      return {
        columns: ["Employee", "Period", "Gross", "Deductions", "Net Salary", "Status"],
        rows: data.map(p => ({
          Employee: p.employeeName, Period: `${MONTH_LABELS[p.month]} ${p.year}`, Gross: p.grossSalary,
          Deductions: p.deductions, "Net Salary": p.netSalary, Status: p.payrollStatus,
        })),
      };
    }
    case "recruitment": {
      const data = await fetchCandidates();
      return {
        columns: ["Candidate", "Applying For", "Source", "Stage", "Date"],
        dateField: "Date",
        rows: data.map(c => ({
          Candidate: c.fullName, "Applying For": c.jobOpeningTitle ?? "General", Source: c.source,
          Stage: c.status, Date: formatDate(c.createdAt),
        })),
      };
    }
    case "performance": {
      const data = await fetchReviews();
      return {
        columns: ["Employee", "Type", "Period", "Rating", "Reviewer", "Date"],
        dateField: "Date",
        rows: data.map(r => ({
          Employee: r.employeeName, Type: r.reviewType, Period: r.period, Rating: r.rating,
          Reviewer: r.reviewerName, Date: formatDate(r.reviewDate),
        })),
      };
    }
  }
}

export function ReportsPage() {
  const [reportType, setReportType] = useState<ReportKey>("employees");
  const [loading,    setLoading]    = useState(true);
  const [columns,    setColumns]    = useState<string[]>([]);
  const [allRows,    setAllRows]    = useState<ReportRow[]>([]);
  const [deptField,  setDeptField]  = useState<string | undefined>(undefined);
  const [department, setDepartment] = useState("");
  const [search,     setSearch]     = useState("");

  useEffect(() => {
    setLoading(true);
    setDepartment("");
    setSearch("");
    loadReportData(reportType).then(({ columns, rows, deptField }) => {
      setColumns(columns);
      setAllRows(rows);
      setDeptField(deptField);
    }).finally(() => setLoading(false));
  }, [reportType]);

  const filtered = useMemo(() => {
    return allRows.filter(row => {
      const matchDept = !department || !deptField || row[deptField] === department;
      const matchSearch = !search || Object.values(row).some(v => String(v).toLowerCase().includes(search.toLowerCase()));
      return matchDept && matchSearch;
    });
  }, [allRows, department, deptField, search]);

  const reportMeta = REPORT_TYPES.find(r => r.key === reportType)!;

  function handleExportCsv() {
    if (filtered.length === 0) return;
    exportToCsv(`${reportType}-report.csv`, filtered);
  }

  async function handleExportPdf() {
    if (filtered.length === 0) return;
    await exportTableToPdf(
      reportMeta.label,
      columns,
      filtered.map(row => columns.map(c => row[c] ?? "—")),
      `${reportType}-report.pdf`
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Generate and export reports across HR, attendance, payroll, and recruitment"
      />

      <div className="flex flex-wrap items-center gap-2">
        {REPORT_TYPES.map(r => (
          <button key={r.key} onClick={() => setReportType(r.key)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
              reportType === r.key ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            )}>
            {r.label}
          </button>
        ))}
      </div>

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
        {reportMeta.hasDepartment && (
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
    </div>
  );
}
