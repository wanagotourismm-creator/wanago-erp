"use client";

import { useRef, useState } from "react";
import { CalendarPlus, PencilLine, Laptop, LifeBuoy, Sparkles, Clock, CalendarDays, Wallet, Activity } from "lucide-react";
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
import { MyTicketsList } from "@/modules/ess/components/MyTicketsList";
import { ReportIssueForm } from "@/modules/ess/components/ReportIssueForm";
import { HrChatPanel } from "@/modules/ess/components/HrChatPanel";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/helpers";

const TABS = [
  { key: "Attendance", icon: Clock },
  { key: "My Leaves", icon: CalendarDays },
  { key: "My Assets", icon: Laptop },
  { key: "IT Support", icon: LifeBuoy },
  { key: "Payslips", icon: Wallet },
  { key: "Activity", icon: Activity },
  { key: "Ask HR", icon: Sparkles },
] as const;
type Tab = (typeof TABS)[number]["key"];

const todayStr = () => new Date().toISOString().slice(0, 10);

export function EssPage() {
  const { user } = useAuthStore();
  const {
    loading, employee, directReports, attendance, leaves, regularizations, teamInbox,
    holidays, payroll, activity, myAssets, assetRequests, myTickets,
    todayRecord, isClockedIn, isClockedOut, isOnBreak, leaveBalances,
    clockIn, clockOut, startBreak, endBreak, applyLeave, cancelMyLeave,
    requestCorrection, requestAsset, reportIssue, decideInboxItem,
  } = useEss();

  const [applyOpen, setApplyOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionDate, setCorrectionDate] = useState<string | null>(null);
  const [assetRequestOpen, setAssetRequestOpen] = useState(false);
  const [reportIssueOpen, setReportIssueOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("Attendance");
  const tabsRef = useRef<HTMLDivElement>(null);

  function goToTab(t: Tab) {
    setTab(t);
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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

  const quickActions = [
    { label: "Apply Leave", icon: CalendarPlus, onClick: () => setApplyOpen(true) },
    { label: "Request Correction", icon: PencilLine, onClick: () => { setCorrectionDate(todayStr()); setCorrectionOpen(true); } },
    { label: "Request Asset", icon: Laptop, onClick: () => setAssetRequestOpen(true) },
    { label: "Report Issue", icon: LifeBuoy, onClick: () => setReportIssueOpen(true) },
    { label: "Ask HR", icon: Sparkles, onClick: () => goToTab("Ask HR") },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="My HR"
        description={`Welcome back, ${employee.fullName.split(" ")[0]}`}
        actions={<LeaveBalanceChips balances={leaveBalances} />}
      />

      {/* Quick actions — the things people actually come here to do, always one tap away */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {quickActions.map((a) => (
          <button key={a.label} onClick={a.onClick}
            className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors shadow-sm">
            <a.icon size={14} />
            {a.label}
          </button>
        ))}
      </div>

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

      <div ref={tabsRef} className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
              tab === t.key ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40")}>
            <t.icon size={13} />
            {t.key}
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

      {tab === "IT Support" && (
        <MyTicketsList tickets={myTickets} onReport={() => setReportIssueOpen(true)} />
      )}

      {tab === "Payslips" && <MyPayslipsList payroll={payroll} />}

      {tab === "Activity" && <MyActivityList activity={activity} />}

      {tab === "Ask HR" && (
        <HrChatPanel employee={employee} leaveBalances={leaveBalances} holidays={holidays} />
      )}

      <ApplyLeaveForm open={applyOpen} onClose={() => setApplyOpen(false)} onSubmit={applyLeave} />
      <RequestCorrectionForm
        open={correctionOpen}
        date={correctionDate}
        onClose={() => setCorrectionOpen(false)}
        onSubmit={requestCorrection}
      />
      <RequestAssetForm open={assetRequestOpen} onClose={() => setAssetRequestOpen(false)} onSubmit={requestAsset} />
      <ReportIssueForm open={reportIssueOpen} onClose={() => setReportIssueOpen(false)} onSubmit={reportIssue} />
    </div>
  );
}
