"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutGrid, BadgeCheck, Clock, CalendarOff, Wallet,
  UserPlus, Target, GraduationCap, UserCircle, Users2, Settings2,
  Bell, CalendarDays, Network, ClipboardCheck, Megaphone, FileText, HelpCircle,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { canAccessPage } from "@/lib/rbac";
import { HrShell, type HrNavGroup } from "@/modules/ess/components/HrShell";
import { HrOverviewDashboard } from "@/modules/hrms/overview/components/HrOverviewDashboard";
import { EmployeesPage } from "@/modules/hrms/employees/pages/EmployeesPage";
import { AttendancePage } from "@/modules/hrms/attendance/pages/AttendancePage";
import { LeavesPage } from "@/modules/hrms/leaves/pages/LeavesPage";
import { PayrollPage } from "@/modules/hrms/payroll/pages/PayrollPage";
import { OrgChartPage } from "@/modules/hrms/orgchart/pages/OrgChartPage";
import { TeamsPage } from "@/modules/hrms/teams/pages/TeamsPage";
import { RecruitmentPage } from "@/modules/recruitment/pages/RecruitmentPage";
import { PerformancePage } from "@/modules/performance/pages/PerformancePage";
import { TrainingPage } from "@/modules/training/pages/TrainingPage";
import { OnboardingPage } from "@/modules/onboarding/pages/OnboardingPage";
import { LeavePolicyForm } from "@/modules/leavepolicy/components/LeavePolicyForm";
import { AnnouncementsPage } from "@/modules/hrms/announcements-view/pages/AnnouncementsPage";
import { DocumentsHubPage } from "@/modules/hrms/documents-hub/pages/DocumentsHubPage";
import { HelpCenterPanel } from "@/modules/helpcenter/components/HelpCenterPanel";
import { NotificationsPage } from "@/modules/hrms/notifications-view/pages/NotificationsPage";
import { CalendarPage } from "@/modules/hrms/calendar/pages/CalendarPage";
import type { SystemRole } from "@/types/rbac";

export function HrAdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const role = user?.systemRole as SystemRole;

  const [section, setSection] = useState("overview");

  const can = (page: string) => canAccessPage(role, page);

  const navGroups: HrNavGroup[] = [
    {
      label: "",
      items: [
        { key: "overview",      label: "Overview",      icon: LayoutGrid },
        { key: "notifications", label: "Notifications", icon: Bell },
        { key: "calendar",      label: "Calendar",       icon: CalendarDays },
      ],
    },
    {
      label: "Workforce",
      items: [
        can("hrms-employees")  && { key: "employees",  label: "Employees",  icon: BadgeCheck },
        can("hrms-attendance") && { key: "attendance", label: "Attendance", icon: Clock },
        can("hrms-leaves")     && { key: "leaves",     label: "Leaves",     icon: CalendarOff },
        can("hrms-payroll")    && { key: "payroll",    label: "Payroll",    icon: Wallet },
        { key: "orgchart", label: "Org Chart", icon: Network },
        { key: "teams",    label: "Teams",     icon: Users2 },
      ].filter(Boolean) as HrNavGroup["items"],
    },
    {
      label: "Talent",
      items: [
        can("recruitment") && { key: "recruitment", label: "Recruitment", icon: UserPlus },
        can("performance") && { key: "performance", label: "Performance", icon: Target },
        can("training")    && { key: "training",    label: "Training",    icon: GraduationCap },
        { key: "onboarding", label: "Onboarding", icon: ClipboardCheck },
      ].filter(Boolean) as HrNavGroup["items"],
    },
    {
      label: "Policy",
      items: [
        can("hrms-leaves") && { key: "leave-policy", label: "Leave Policy", icon: Settings2 },
      ].filter(Boolean) as HrNavGroup["items"],
    },
    {
      label: "More",
      items: [
        { key: "announcements", label: "Announcements", icon: Megaphone },
        { key: "documents",     label: "Documents",      icon: FileText },
        { key: "help",          label: "Help",           icon: HelpCircle },
      ],
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
        <HrOverviewDashboard
          onAddEmployee={() => setSection("employees")}
          onPostJob={() => setSection("recruitment")}
          onApproveLeave={() => setSection("leaves")}
        />
      )}

      {section === "employees"   && can("hrms-employees")  && <EmployeesPage />}
      {section === "attendance"  && can("hrms-attendance") && <AttendancePage />}
      {section === "leaves"      && can("hrms-leaves")     && <LeavesPage />}
      {section === "payroll"     && can("hrms-payroll")    && <PayrollPage />}
      {section === "orgchart"    && <OrgChartPage />}
      {section === "teams"       && <TeamsPage />}
      {section === "recruitment" && can("recruitment")     && <RecruitmentPage />}
      {section === "performance" && can("performance")     && <PerformancePage />}
      {section === "training"    && can("training")        && <TrainingPage />}
      {section === "onboarding"  && <OnboardingPage />}
      {section === "leave-policy" && can("hrms-leaves")    && <LeavePolicyForm />}
      {section === "announcements" && <AnnouncementsPage />}
      {section === "documents"   && <DocumentsHubPage />}
      {section === "help"        && <HelpCenterPanel />}
      {section === "notifications" && <NotificationsPage />}
      {section === "calendar"    && <CalendarPage />}
    </HrShell>
  );
}
