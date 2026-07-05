"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useEss } from "@/modules/ess/hooks/useEss";
import { ClockCard } from "@/modules/ess/components/ClockCard";
import { MyLeavesList } from "@/modules/ess/components/MyLeavesList";
import { ApplyLeaveForm } from "@/modules/ess/components/ApplyLeaveForm";
import { TeamApprovalsCard } from "@/modules/ess/components/TeamApprovalsCard";
import { HolidaysCard } from "@/modules/ess/components/HolidaysCard";
import { LeaveBalanceChips } from "@/modules/ess/components/LeaveBalanceChips";
import { AttendanceCalendar } from "@/modules/ess/components/AttendanceCalendar";
import { MyPayslipsList } from "@/modules/ess/components/MyPayslipsList";
import { MyActivityList } from "@/modules/ess/components/MyActivityList";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";

const TABS = ["Attendance", "My Leaves", "Payslips", "Activity"] as const;
type Tab = (typeof TABS)[number];

export function EssPage() {
  const { user } = useAuthStore();
  const {
    loading, employee, directReports, attendance, leaves, teamLeaves, holidays, payroll, activity,
    todayRecord, isClockedIn, isClockedOut, isOnBreak, leaveBalances,
    clockIn, clockOut, startBreak, endBreak, applyLeave, cancelMyLeave, decideTeamLeave,
  } = useEss();

  const [applyOpen, setApplyOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("Attendance");

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-5">
        <PageHeader title="My HR" description="Your self-service portal" />
        <EmptyState
          title="No employee profile linked yet"
          description={`Your account (${user?.email}) isn't linked to an employee record. Ask HR to add or link your profile to use clock in/out and leave requests.`}
          icon={<span className="text-2xl">👤</span>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="My HR"
        description={`Welcome back, ${employee.fullName.split(" ")[0]}`}
        actions={<LeaveBalanceChips balances={leaveBalances} />}
      />

      {directReports.length > 0 && (
        <TeamApprovalsCard teamLeaves={teamLeaves} onDecide={decideTeamLeave} />
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ClockCard
          todayRecord={todayRecord}
          isClockedIn={isClockedIn}
          isClockedOut={isClockedOut}
          isOnBreak={isOnBreak}
          attendance={attendance}
          onClockIn={clockIn}
          onClockOut={clockOut}
          onStartBreak={startBreak}
          onEndBreak={endBreak}
        />
        <HolidaysCard holidays={holidays} />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
              tab === t ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Attendance" && (
        <AttendanceCalendar attendance={attendance} leaves={leaves} holidays={holidays} />
      )}

      {tab === "My Leaves" && (
        <MyLeavesList
          leaves={leaves}
          onApply={() => setApplyOpen(true)}
          onCancel={(l) => { if (confirm("Cancel this leave request?")) cancelMyLeave(l.id); }}
        />
      )}

      {tab === "Payslips" && <MyPayslipsList payroll={payroll} />}

      {tab === "Activity" && <MyActivityList activity={activity} />}

      <ApplyLeaveForm open={applyOpen} onClose={() => setApplyOpen(false)} onSubmit={applyLeave} />
    </div>
  );
}
