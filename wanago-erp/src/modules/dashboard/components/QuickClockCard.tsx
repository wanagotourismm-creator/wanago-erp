"use client";

import { useQuickClock } from "@/modules/dashboard/hooks/useQuickClock";
import { ClockCard } from "@/modules/ess/components/ClockCard";
import { SkeletonCard } from "@/components/ui/Skeleton";

// Lets an employee check in/out straight from the Dashboard instead of
// needing to go into My HR first. Renders nothing once loaded if the
// signed-in account has no linked employee record (e.g. a pure admin/owner
// login) — same as ESS itself, there's nothing to clock for that account.
export function QuickClockCard() {
  const {
    loading, employee, attendance, attendancePolicy, todayRecord,
    isClockedIn, isClockedOut, isOnBreak, forgottenCheckout,
    clockIn, clockOut, resolveCheckInContext, startBreak, endBreak,
  } = useQuickClock();

  if (loading) return <SkeletonCard rows={4} />;
  if (!employee) return null;

  return (
    <ClockCard
      todayRecord={todayRecord}
      isClockedIn={isClockedIn}
      isClockedOut={isClockedOut}
      isOnBreak={isOnBreak}
      attendance={attendance}
      attendancePolicy={attendancePolicy}
      forgottenCheckout={forgottenCheckout}
      onClockIn={clockIn}
      onClockOut={clockOut}
      onResolveContext={resolveCheckInContext}
      onStartBreak={startBreak}
      onEndBreak={endBreak}
    />
  );
}
