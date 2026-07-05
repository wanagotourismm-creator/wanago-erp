"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutGrid, Users2, Inbox, Clock, CalendarDays, Laptop, LifeBuoy, Wallet, Activity, Sparkles,
  CalendarPlus, PencilLine, Gauge, ArrowRight, UserCircle,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useEss } from "@/modules/ess/hooks/useEss";
import { useTeamRoster } from "@/modules/ess/hooks/useTeamRoster";
import { HrShell, type HrNavGroup } from "@/modules/ess/components/HrShell";
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
import { TeamRosterPanel } from "@/modules/ess/components/TeamRosterPanel";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";

const todayStr = () => new Date().toISOString().slice(0, 10);

export function EssPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const {
    loading, employee, directReports, attendance, leaves, regularizations, teamInbox,
    holidays, payroll, activity, myAssets, assetRequests, myTickets,
    todayRecord, isClockedIn, isClockedOut, isOnBreak, leaveBalances, leavePolicy, enabledLeaveTypes,
    clockIn, clockOut, startBreak, endBreak, applyLeave, cancelMyLeave,
    requestCorrection, requestAsset, reportIssue, decideInboxItem,
  } = useEss();

  const isManager = directReports.length > 0;
  const { roster, loading: rosterLoading } = useTeamRoster(directReports);
  const isHrOrAdmin = !!user && hasPermission(user.systemRole, "hrms:manage");

  const [section, setSection] = useState("overview");
  const [applyOpen, setApplyOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionDate, setCorrectionDate] = useState<string | null>(null);
  const [assetRequestOpen, setAssetRequestOpen] = useState(false);
  const [reportIssueOpen, setReportIssueOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 p-8 shadow-xl">
        <EmptyState
          title="No employee profile linked yet"
          description={`Your account (${user?.email}) isn't linked to an employee record. Ask HR to add or link your profile to use clock in/out and leave requests.`}
          icon={<span className="text-2xl">👤</span>}
          className="text-slate-300"
        />
      </div>
    );
  }

  const navGroups: HrNavGroup[] = [
    { label: "", items: [{ key: "overview", label: "Overview", icon: LayoutGrid }] },
    ...(isManager ? [{
      label: "Management",
      items: [
        { key: "team", label: "My Team", icon: Users2 },
        { key: "approvals", label: "Approvals", icon: Inbox, badge: teamInbox.length },
      ],
    }] : []),
    {
      label: "Self Service",
      items: [
        { key: "attendance", label: "Attendance", icon: Clock },
        { key: "leaves", label: "My Leaves", icon: CalendarDays },
        { key: "assets", label: "My Assets", icon: Laptop },
        { key: "support", label: "IT Support", icon: LifeBuoy },
        { key: "payslips", label: "Payslips", icon: Wallet },
        { key: "activity", label: "Activity", icon: Activity },
      ],
    },
    { label: "Assistant", items: [{ key: "ask", label: "Ask HR", icon: Sparkles }] },
  ];

  return (
    <div className="space-y-5">
      <HrShell
        navGroups={navGroups}
        activeKey={section}
        onNavigate={setSection}
        headerIcon={UserCircle}
        headerTitle={`Welcome back, ${employee.fullName.split(" ")[0]}`}
        headerSubtitle={`${employee.designation} · ${employee.department}`}
        headerRight={<LeaveBalanceChips balances={leaveBalances} />}
      >
        {section === "overview" && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {[
                { label: "Apply Leave", icon: CalendarPlus, onClick: () => setApplyOpen(true) },
                { label: "Request Correction", icon: PencilLine, onClick: () => { setCorrectionDate(todayStr()); setCorrectionOpen(true); } },
                { label: "Request Asset", icon: Laptop, onClick: () => setAssetRequestOpen(true) },
                { label: "Report Issue", icon: LifeBuoy, onClick: () => setReportIssueOpen(true) },
                { label: "Ask HR", icon: Sparkles, onClick: () => setSection("ask") },
              ].map((a) => (
                <button key={a.label} onClick={a.onClick}
                  className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors shadow-sm">
                  <a.icon size={14} />
                  {a.label}
                </button>
              ))}
            </div>

            {isManager && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Your Team</p>
                    <p className="text-xs text-muted-foreground">{directReports.length} direct report{directReports.length === 1 ? "" : "s"} · {teamInbox.length} pending approval{teamInbox.length === 1 ? "" : "s"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSection("team")} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
                      View Team <ArrowRight size={12} />
                    </button>
                    <button onClick={() => setSection("approvals")} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors">
                      Approvals <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isHrOrAdmin && (
              <button onClick={() => router.push("/hrms-admin")}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-primary/40 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <Gauge size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">HR Admin</p>
                    <p className="text-xs text-muted-foreground">Employees, attendance, leaves, payroll, recruitment & more</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-muted-foreground" />
              </button>
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
          </div>
        )}

        {section === "team" && isManager && <TeamRosterPanel roster={roster} loading={rosterLoading} />}

        {section === "approvals" && isManager && <InboxCard items={teamInbox} onDecide={decideInboxItem} />}

        {section === "attendance" && (
          <div className="space-y-5">
            <AttendanceCalendar
              attendance={attendance}
              leaves={leaves}
              holidays={holidays}
              weeklyOffDays={leavePolicy.weeklyOffDays}
              onRequestCorrection={(date) => { setCorrectionDate(date); setCorrectionOpen(true); }}
            />
            <MyCorrectionsList regularizations={regularizations} />
          </div>
        )}

        {section === "leaves" && (
          <MyLeavesList
            leaves={leaves}
            onApply={() => setApplyOpen(true)}
            onCancel={(l) => { if (confirm("Cancel this leave request?")) cancelMyLeave(l.id); }}
          />
        )}

        {section === "assets" && (
          <MyAssetsList assets={myAssets} assetRequests={assetRequests} onRequest={() => setAssetRequestOpen(true)} />
        )}

        {section === "support" && (
          <MyTicketsList tickets={myTickets} onReport={() => setReportIssueOpen(true)} />
        )}

        {section === "payslips" && <MyPayslipsList payroll={payroll} />}

        {section === "activity" && <MyActivityList activity={activity} />}

        {section === "ask" && (
          <HrChatPanel employee={employee} leaveBalances={leaveBalances} holidays={holidays} />
        )}
      </HrShell>

      <ApplyLeaveForm open={applyOpen} enabledLeaveTypes={enabledLeaveTypes} onClose={() => setApplyOpen(false)} onSubmit={applyLeave} />
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
