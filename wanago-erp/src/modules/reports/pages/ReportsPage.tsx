"use client";

import { cn } from "@/lib/utils/helpers";
import { PageHeader } from "@/components/ui/PageHeader";
import { useReportData } from "@/modules/reports/hooks/useReportData";
import { ReportTable } from "@/modules/reports/components/ReportTable";
import { SalesTrendChart } from "@/modules/reports/components/SalesTrendChart";
import { RetentionChart } from "@/modules/reports/components/RetentionChart";
import type { ReportTypeConfig } from "@/modules/reports/types";

// `allowedRoles` mirrors firestore.rules exactly — employees/attendance/
// leaves are open reads for any authenticated user, but payroll/
// candidates/performanceReviews are role-restricted there. Previously
// every tab was shown to every role that could reach /reports at all, so
// e.g. a marketing user saw a Recruitment/Performance tab that always
// silently returned nothing.
const REPORT_TYPES: ReportTypeConfig[] = [
  { key: "employees",   label: "Employee Report",    hasDepartment: true  },
  { key: "attendance",  label: "Attendance Report",   hasDepartment: false },
  { key: "leaves",      label: "Leave Report",        hasDepartment: false },
  { key: "payroll",     label: "Payroll Report",      hasDepartment: false, allowedRoles: ["super_admin", "admin", "hr", "finance"] },
  { key: "recruitment", label: "Recruitment Report",  hasDepartment: false, allowedRoles: ["super_admin", "admin", "hr"] },
  { key: "performance", label: "Performance Report",  hasDepartment: false, allowedRoles: ["super_admin", "admin", "hr"] },
  { key: "customer-retention", label: "Customer Retention", hasDepartment: false, allowedRoles: ["super_admin", "admin", "finance"] },
  { key: "sales-trend", label: "Sales Trend", hasDepartment: false, allowedRoles: ["super_admin", "admin", "finance"] },
];

export function ReportsPage() {
  const {
    visibleReportTypes, reportType, setReportType,
    loading, columns, filtered, cohorts,
    department, setDepartment,
    search, setSearch, error,
  } = useReportData(REPORT_TYPES);

  const reportMeta = REPORT_TYPES.find(r => r.key === reportType)!;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        tourId="tour-reports-header"
        description="Generate and export reports across HR, attendance, payroll, recruitment, and sales"
      />

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {visibleReportTypes.map(r => (
          <button key={r.key} onClick={() => setReportType(r.key)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
              reportType === r.key ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            )}>
            {r.label}
          </button>
        ))}
      </div>

      {reportType === "sales-trend" ? (
        <SalesTrendChart />
      ) : (
        <>
          {reportType === "customer-retention" && cohorts && cohorts.length > 0 && (
            <RetentionChart cohorts={cohorts} />
          )}
          <ReportTable
            reportKey={reportType}
            label={reportMeta.label}
            hasDepartment={reportMeta.hasDepartment}
            loading={loading}
            columns={columns}
            filtered={filtered}
            department={department}
            setDepartment={setDepartment}
            search={search}
            setSearch={setSearch}
          />
        </>
      )}
    </div>
  );
}
