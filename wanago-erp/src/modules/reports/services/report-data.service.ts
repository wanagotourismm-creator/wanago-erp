import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { fetchAttendanceRecords } from "@/modules/hrms/attendance/services/attendance.service";
import { fetchLeaves } from "@/modules/hrms/leaves/services/leave.service";
import { fetchPayrollRecords } from "@/modules/hrms/payroll/services/payroll.service";
import { fetchCandidates } from "@/modules/recruitment/candidates/services/candidate.service";
import { fetchReviews } from "@/modules/performance/reviews/services/review.service";
import { MONTH_LABELS } from "@/modules/hrms/payroll/components/PayrollBadges";
import { formatDate } from "@/lib/utils/helpers";
import { auth } from "@/lib/firebase/client";
import type { ReportKey, ReportData, RetentionCohort } from "@/modules/reports/types";

// Moved verbatim from the old monolithic ReportsPage.tsx — each case still
// calls the same module's own fetch* function it always did; only the
// customer-retention case gained a `cohorts` passthrough (for the new
// RetentionChart) on top of its existing flattened `rows`.
export async function loadReportData(key: ReportKey): Promise<ReportData> {
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
        columns: ["Employee", "Date", "Status", "Check In", "Check Out", "Hours"],
        dateField: "Date",
        rows: data.map(a => ({
          Employee: a.employeeName, Date: formatDate(a.date), Status: a.status,
          "Check In": a.clockIn ?? "—", "Check Out": a.clockOut ?? "—", Hours: a.hoursWorked ?? "—",
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
    case "customer-retention": {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/reports/customer-retention", {
        headers: idToken ? { authorization: `Bearer ${idToken}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load customer retention report");
      const { cohorts } = await res.json() as { cohorts: RetentionCohort[] };
      return {
        columns: ["Signup Cohort", "New Customers", "Rebooked (90d)", "% (90d)", "Rebooked (180d)", "% (180d)"],
        cohorts,
        rows: cohorts.map(c => ({
          "Signup Cohort": c.month, "New Customers": c.newCustomers,
          "Rebooked (90d)": c.rebooked90, "% (90d)": `${c.pct90.toFixed(1)}%`,
          "Rebooked (180d)": c.rebooked180, "% (180d)": `${c.pct180.toFixed(1)}%`,
        })),
      };
    }
    case "sales-trend":
      // Rendered directly by SalesTrendChart via useSalesTrend — this
      // service only handles the generic column/row tabs.
      return { columns: [], rows: [] };
  }
}
