"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutGrid, BadgeCheck, Clock, CalendarOff, Wallet,
  UserPlus, Target, GraduationCap, UserCircle, Users2, Settings2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { canAccessPage } from "@/lib/rbac";
import { useHrOverview } from "@/modules/hrms/overview/hooks/useHrOverview";
import { HrKpiOverview, HrTodayAttendanceList } from "@/modules/hrms/overview/components/HrOverviewContent";
import { HrShell, type HrNavGroup } from "@/modules/ess/components/HrShell";
import { EmployeesPage } from "@/modules/hrms/employees/pages/EmployeesPage";
import { AttendancePage } from "@/modules/hrms/attendance/pages/AttendancePage";
import { LeavesPage } from "@/modules/hrms/leaves/pages/LeavesPage";
import { PayrollPage } from "@/modules/hrms/payroll/pages/PayrollPage";
import { RecruitmentPage } from "@/modules/recruitment/pages/RecruitmentPage";
import { PerformancePage } from "@/modules/performance/pages/PerformancePage";
import { TrainingPage } from "@/modules/training/pages/TrainingPage";
import { LeavePolicyForm } from "@/modules/leavepolicy/components/LeavePolicyForm";
import type { SystemRole } from "@/types/rbac";

export function HrAdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const role = user?.systemRole as SystemRole;

  const {
    loading, employeesToday, departmentSummaries,
    headcount, attendancePct, onLeaveToday, absentToday, unmarkedToday, awaitingApproval,
  } = useHrOverview();
  const [section, setSection] = useState("overview");

  const can = (page: string) => canAccessPage(role, page);

  const navGroups: HrNavGroup[] = [
    { label: "", items: [{ key: "overview", label: "Overview", icon: LayoutGrid }] },
    {
      label: "Workforce",
      items: [
        can("hrms-employees")  && { key: "employees",  label: "Employees",  icon: BadgeCheck },
        can("hrms-attendance") && { key: "attendance", label: "Attendance", icon: Clock },
        can("hrms-leaves")     && { key: "leaves",     label: "Leaves",     icon: CalendarOff },
        can("hrms-payroll")    && { key: "payroll",    label: "Payroll",    icon: Wallet },
      ].filter(Boolean) as HrNavGroup["items"],
    },
    {
      label: "Talent",
      items: [
        can("recruitment") && { key: "recruitment", label: "Recruitment", icon: UserPlus },
        can("performance") && { key: "performance", label: "Performance", icon: Target },
        can("training")    && { key: "training",    label: "Training",    icon: GraduationCap },
      ].filter(Boolean) as HrNavGroup["items"],
    },
    {
      label: "Policy",
      items: [
        can("hrms-leaves") && { key: "leave-policy", label: "Leave Policy", icon: Settings2 },
      ].filter(Boolean) as HrNavGroup["items"],
    },
    { label: "", items: [{ key: "my-hr", label: "Go to My HR", icon: UserCircle }] },
  ].filter((g) => g.items.length > 0);

  function handleNavigate(key: string) {
    if (key === "my-hr") { router.push("/ess"); return; }
    setSection(key);
  }

  return (
    <HrShell
      navGroups={navGroups}
      activeKey={section}
      onNavigate={handleNavigate}
      headerIcon={Users2}
      headerTitle="HR Admin"
      headerSubtitle="Every HR tool in one place"
    >
      {section === "overview" && (
        loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-5">
            <HrKpiOverview
              headcount={headcount} attendancePct={attendancePct} onLeaveToday={onLeaveToday}
              absentToday={absentToday} unmarkedToday={unmarkedToday} awaitingApproval={awaitingApproval}
              departmentSummaries={departmentSummaries}
            />
            <HrTodayAttendanceList employeesToday={employeesToday} />
          </div>
        )
      )}

      {section === "employees"   && can("hrms-employees")  && <EmployeesPage />}
      {section === "attendance"  && can("hrms-attendance") && <AttendancePage />}
      {section === "leaves"      && can("hrms-leaves")     && <LeavesPage />}
      {section === "payroll"     && can("hrms-payroll")    && <PayrollPage />}
      {section === "recruitment" && can("recruitment")     && <RecruitmentPage />}
      {section === "performance" && can("performance")     && <PerformancePage />}
      {section === "training"    && can("training")        && <TrainingPage />}
      {section === "leave-policy" && can("hrms-leaves")    && <LeavePolicyForm />}
    </HrShell>
  );
}
