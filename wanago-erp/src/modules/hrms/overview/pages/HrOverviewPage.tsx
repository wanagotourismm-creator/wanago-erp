"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, ListChecks, UserCircle, Gauge } from "lucide-react";
import { useHrOverview } from "@/modules/hrms/overview/hooks/useHrOverview";
import { HrKpiOverview, HrTodayAttendanceList } from "@/modules/hrms/overview/components/HrOverviewContent";
import { HrShell, type HrNavGroup } from "@/modules/ess/components/HrShell";

const NAV_GROUPS: HrNavGroup[] = [
  { label: "", items: [{ key: "overview", label: "Overview", icon: LayoutGrid }] },
  { label: "Details", items: [{ key: "attendance", label: "Today's Attendance", icon: ListChecks }] },
  { label: "", items: [{ key: "my-hr", label: "Go to My HR", icon: UserCircle }] },
];

export function HrOverviewPage() {
  const router = useRouter();
  const {
    loading, employeesToday, departmentSummaries,
    headcount, attendancePct, onLeaveToday, absentToday, unmarkedToday, awaitingApproval,
  } = useHrOverview();
  const [section, setSection] = useState("overview");

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  function handleNavigate(key: string) {
    if (key === "my-hr") { router.push("/ess"); return; }
    setSection(key);
  }

  return (
    <HrShell
      navGroups={NAV_GROUPS}
      activeKey={section}
      onNavigate={handleNavigate}
      headerIcon={Gauge}
      headerTitle="Company HR Overview"
      headerSubtitle="Attendance, headcount and department performance at a glance"
    >
      {section === "overview" && (
        <HrKpiOverview
          headcount={headcount} attendancePct={attendancePct} onLeaveToday={onLeaveToday}
          absentToday={absentToday} unmarkedToday={unmarkedToday} awaitingApproval={awaitingApproval}
          departmentSummaries={departmentSummaries}
        />
      )}

      {section === "attendance" && <HrTodayAttendanceList employeesToday={employeesToday} />}
    </HrShell>
  );
}
