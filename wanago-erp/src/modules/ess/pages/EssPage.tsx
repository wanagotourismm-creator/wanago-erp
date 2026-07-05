"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useEss } from "@/modules/ess/hooks/useEss";
import { ClockCard } from "@/modules/ess/components/ClockCard";
import { MyLeavesList } from "@/modules/ess/components/MyLeavesList";
import { ApplyLeaveForm } from "@/modules/ess/components/ApplyLeaveForm";
import { RequestCorrectionForm } from "@/modules/ess/components/RequestCorrectionForm";
import { InboxCard } from "@/modules/ess/components/InboxCard";
import { HolidaysCard } from "@/modules/ess/components/HolidaysCard";
import { LeaveBalanceChips } from "@/modules/ess/components/LeaveBalanceChips";
import { AttendanceCalendar } from "@/modules/ess/components/AttendanceCalendar";
import { MyCorrectionsList } from "@/modules/ess/components/MyCorrectionsList";
import { MyPayslipsList } from "@/modules/ess/components/MyPayslipsList";
import { MyActivityList } from "@/modules/ess/components/MyActivityList";
import { MyAssetsList } from "@/modules/ess/components/MyAssetsList";
import { RequestAssetForm } from "@/modules/ess/components/RequestAssetForm";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";

const TABS = ["Attendance", "My Leaves", "My Assets", "Payslips", "Activity"] as const;
type Tab = (typeof TABS)[number];

export function EssPage() {
  const { user } = useAuthStore();
  const {
    loading, employee, directReports, attendance, leaves, regularizations, teamInbox,
    holidays, payroll, activity, myAssets, assetRequests,
    todayRecord, isClockedIn, isClockedOut, isOnBreak, leaveBalances,
    clockIn, clockOut, startBreak, endBreak, applyLeave, cancelMyLeave,
    requestCorrection, requestAsset, decideInboxItem,
  } = useEss();

  const [applyOpen, setApplyOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionDate, setCorrectionDate] = useState<string | null>(null);
  const [assetRequestOpen, setAssetRequestOpen] = useState(false);
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
        <InboxCard items={teamInbox} onDecide={decideInboxItem} />
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
        <div className="space-y-5">
          <AttendanceCalendar
            attendance={attendance}
            leaves={leaves}
            holidays={holidays}
            onRequestCorrection={(date) => { setCorrectionDate(date); setCorrectionOpen(true); }}
          />
          <MyCorrectionsList regularizations={regularizations} />
        </div>
      )}

      {tab === "My Leaves" && (
        <MyLeavesList
          leaves={leaves}
          onApply={() => setApplyOpen(true)}
          onCancel={(l) => { if (confirm("Cancel this leave request?")) cancelMyLeave(l.id); }}
        />
      )}

      {tab === "My Assets" && (
        <MyAssetsList assets={myAssets} assetRequests={assetRequests} onRequest={() => setAssetRequestOpen(true)} />
      )}

      {tab === "Payslips" && <MyPayslipsList payroll={payroll} />}

      {tab === "Activity" && <MyActivityList activity={activity} />}

      <ApplyLeaveForm open={applyOpen} onClose={() => setApplyOpen(false)} onSubmit={applyLeave} />
      <RequestCorrectionForm
        open={correctionOpen}
        date={correctionDate}
        onClose={() => setCorrectionOpen(false)}
        onSubmit={requestCorrection}
      />
      <RequestAssetForm open={assetRequestOpen} onClose={() => setAssetRequestOpen(false)} onSubmit={requestAsset} />
    </div>
  );
}
