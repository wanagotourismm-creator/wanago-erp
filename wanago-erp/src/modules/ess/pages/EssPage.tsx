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
import { useAuthStore } from "@/store/auth.store";

export function EssPage() {
  const { user } = useAuthStore();
  const {
    loading, employee, directReports, attendance, leaves, teamLeaves, holidays,
    todayRecord, isClockedIn, isClockedOut,
    clockIn, clockOut, applyLeave, cancelMyLeave, decideTeamLeave,
  } = useEss();

  const [applyOpen, setApplyOpen] = useState(false);

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
        <PageHeader title="My Space" description="Your self-service portal" />
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
      <PageHeader title="My Space" description={`Welcome back, ${employee.fullName.split(" ")[0]}`} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ClockCard
          todayRecord={todayRecord}
          isClockedIn={isClockedIn}
          isClockedOut={isClockedOut}
          attendance={attendance}
          onClockIn={clockIn}
          onClockOut={clockOut}
        />
        <HolidaysCard holidays={holidays} />
      </div>

      {directReports.length > 0 && (
        <TeamApprovalsCard teamLeaves={teamLeaves} onDecide={decideTeamLeave} />
      )}

      <MyLeavesList
        leaves={leaves}
        onApply={() => setApplyOpen(true)}
        onCancel={(l) => { if (confirm("Cancel this leave request?")) cancelMyLeave(l.id); }}
      />

      <ApplyLeaveForm open={applyOpen} onClose={() => setApplyOpen(false)} onSubmit={applyLeave} />
    </div>
  );
}
