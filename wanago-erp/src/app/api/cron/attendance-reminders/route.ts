import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { notifyUserServer } from "@/lib/server/notify-server";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { nowTimeIST, todayIST } from "@/lib/utils/helpers";
import type { AttendancePolicy } from "@/modules/attendancepolicy/services/attendance-policy.service";

export const runtime = "nodejs";

// Triggered every 5 minutes by a GitHub Actions schedule (see
// .github/workflows/attendance-reminders.yml) rather than Vercel Cron —
// this project is on Vercel's Hobby plan, which only allows daily cron,
// and this feature needs to catch things (a late check-in, an overrunning
// break) close to when they actually happen.

// Duplicated rather than imported — importing attendance-policy.service.ts
// would pull the client Firestore SDK (`db` from lib/firebase/client) into
// this Admin-SDK-only route, same reasoning as DEFAULT_TICKET_SLA_HOURS in
// daily-reminders/route.ts.
const DEFAULT_ATTENDANCE_POLICY: AttendancePolicy = {
  workStartTime: "10:00", workEndTime: "18:00", gracePeriodMinutes: 5,
  halfDayHours: 4, fullDayHours: 8, breakAllowanceMinutes: 65, breakTime: "13:00",
  lateReasonRequired: true,
};
const DEFAULT_WEEKLY_OFF_DAYS = [0]; // Sunday

// How much further past the bare threshold before escalating to admin +
// manager — gives someone who's a few minutes late (already flagged to
// themselves via the reminder/late-arrival system) a chance to arrive
// before their manager gets paged about it.
const LATE_ESCALATION_BUFFER_MIN = 10;
const BREAK_OVERRUN_ESCALATION_BUFFER_MIN = 15;
const CHECKOUT_MISSING_ESCALATION_BUFFER_MIN = 30;

type EmployeeDoc = {
  id: string;
  fullName: string;
  email: string | null;
  userId?: string | null;
  employeeStatus: string;
  reportingManagerId: string | null;
  functionalManagerId: string | null;
};
type UserDoc = { id: string; email: string; systemRole?: string };
type AttendanceDoc = {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breakStartTime: string | null;
};
type LeaveDoc = { employeeId: string; fromDate: string; toDate: string; status: string };
type HolidayDoc = { date: string };
type NotificationLogDoc = { employeeId: string; date: string; type: string };

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
function addMinutes(time: string, delta: number): string {
  const total = ((minutesOf(time) + delta) % 1440 + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
// Day-of-week purely from the already-IST-correct "YYYY-MM-DD" string —
// never from the server's own (UTC) Date, which would disagree with IST
// for part of the day (see dateIST()'s comment in lib/utils/helpers.ts).
function dayOfWeekIST(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 500 });
  }

  const today = todayIST();
  const now = nowTimeIST();
  const nowMin = minutesOf(now);

  const [policySnap, leavePolicySnap, holidaysSnap] = await Promise.all([
    db.collection(FIRESTORE_COLLECTIONS.SETTINGS).doc("attendancePolicy").get(),
    db.collection(FIRESTORE_COLLECTIONS.SETTINGS).doc("leavePolicy").get(),
    db.collection(FIRESTORE_COLLECTIONS.HOLIDAYS).where("date", "==", today).get(),
  ]);
  const policy: AttendancePolicy = { ...DEFAULT_ATTENDANCE_POLICY, ...(policySnap.data() as Partial<AttendancePolicy> | undefined) };
  const weeklyOffDays: number[] = (leavePolicySnap.data()?.weeklyOffDays as number[] | undefined) ?? DEFAULT_WEEKLY_OFF_DAYS;
  const holidayDocs = holidaysSnap.docs.map(d => d.data() as HolidayDoc);

  // Nobody's expected to check in on an off day — skip the whole run
  // rather than firing "time to check in" at everyone on a Sunday/holiday.
  if (weeklyOffDays.includes(dayOfWeekIST(today)) || holidayDocs.length > 0) {
    return NextResponse.json({ skipped: "off day" });
  }

  const [employeesSnap, usersSnap, attendanceSnap, approvedLeavesSnap, notificationLogSnap] = await Promise.all([
    db.collection(FIRESTORE_COLLECTIONS.HRMS_EMPLOYEES).where("employeeStatus", "==", "active").get(),
    db.collection(FIRESTORE_COLLECTIONS.USERS).get(),
    db.collection(FIRESTORE_COLLECTIONS.HRMS_CHECK_INS).where("date", "==", today).get(),
    db.collection(FIRESTORE_COLLECTIONS.HRMS_LEAVES).where("status", "==", "approved").get(),
    db.collection(FIRESTORE_COLLECTIONS.ATTENDANCE_NOTIFICATION_LOG).where("date", "==", today).get(),
  ]);

  const employees = employeesSnap.docs.map(d => ({ id: d.id, ...d.data() }) as EmployeeDoc);
  const employeeById = new Map(employees.map(e => [e.id, e]));
  const userById = new Map(usersSnap.docs.map(d => [d.id, ({ id: d.id, ...d.data() }) as UserDoc]));
  const attendanceByEmployeeId = new Map(
    attendanceSnap.docs.map(d => [(d.data() as AttendanceDoc).employeeId, ({ id: d.id, ...d.data() }) as AttendanceDoc])
  );
  const onApprovedLeaveToday = new Set(
    approvedLeavesSnap.docs
      .map(d => d.data() as LeaveDoc)
      .filter(l => l.fromDate <= today && today <= l.toDate)
      .map(l => l.employeeId)
  );
  const alreadyLogged = new Set(
    notificationLogSnap.docs.map(d => { const l = d.data() as NotificationLogDoc; return `${l.employeeId}_${l.type}`; })
  );

  const admins = Array.from(userById.values()).filter(u => u.systemRole === "admin" || u.systemRole === "super_admin");

  const logWrites: Promise<unknown>[] = [];
  const notifyTasks: Promise<unknown>[] = [];
  const counts = { checkinReminder: 0, breakReminder: 0, checkoutReminder: 0, breakOverrunWarning: 0, breakOverrunEscalation: 0, lateEscalation: 0, checkoutMissingEscalation: 0 };

  function logType(employeeId: string, type: string) {
    const key = `${employeeId}_${type}`;
    if (alreadyLogged.has(key)) return false;
    alreadyLogged.add(key);
    logWrites.push(
      db!.collection(FIRESTORE_COLLECTIONS.ATTENDANCE_NOTIFICATION_LOG).doc(`${employeeId}_${today}_${type}`).set({
        employeeId, date: today, type, sentAt: new Date(),
      })
    );
    return true;
  }

  function notifyEmployee(employee: EmployeeDoc, title: string, body: string) {
    if (!employee.userId) return;
    notifyTasks.push(notifyUserServer({
      userId: employee.userId, email: employee.email, title, body, link: "/ess", category: "attendance",
    }));
  }

  function escalate(employee: EmployeeDoc, title: string, body: string) {
    const recipients = new Map<string, { userId: string; email: string | null }>();
    for (const a of admins) recipients.set(a.id, { userId: a.id, email: a.email });
    const managerId = employee.reportingManagerId ?? employee.functionalManagerId;
    if (managerId) {
      const manager = employeeById.get(managerId);
      if (manager?.userId) recipients.set(manager.userId, { userId: manager.userId, email: manager.email });
    }
    for (const r of recipients.values()) {
      notifyTasks.push(notifyUserServer({
        userId: r.userId, email: r.email, title, body, link: "/hrms/attendance", category: "attendance",
      }));
    }
  }

  const checkinReminderAt = minutesOf(addMinutes(policy.workStartTime, -10));
  const breakReminderAt = minutesOf(addMinutes(policy.breakTime, -10));
  const checkoutReminderAt = minutesOf(addMinutes(policy.workEndTime, -10));
  const lateEscalateAt = minutesOf(policy.workStartTime) + policy.gracePeriodMinutes + LATE_ESCALATION_BUFFER_MIN;
  const checkoutMissingEscalateAt = minutesOf(policy.workEndTime) + CHECKOUT_MISSING_ESCALATION_BUFFER_MIN;

  for (const employee of employees) {
    if (onApprovedLeaveToday.has(employee.id)) continue;
    const record = attendanceByEmployeeId.get(employee.id);
    const checkedIn = !!record?.clockIn;
    const checkedOut = !!record?.clockOut;

    // ── Check-in reminder ────────────────────────────────────────────
    if (!checkedIn && nowMin >= checkinReminderAt && logType(employee.id, "checkin_reminder")) {
      notifyEmployee(employee,
        "⏰ Wanago Workspace",
        `It's time to check in at ${policy.workStartTime}. Current time is ${now}.`);
      counts.checkinReminder++;
    }

    // ── Late-arrival escalation ──────────────────────────────────────
    if (!checkedIn && nowMin >= lateEscalateAt && logType(employee.id, "late_escalation")) {
      escalate(employee,
        "⚠️ Late check-in",
        `${employee.fullName} still hasn't checked in (expected ${policy.workStartTime}, now ${now}).`);
      counts.lateEscalation++;
    }

    if (!checkedIn || checkedOut) continue; // everything below needs "currently clocked in"
    const onBreak = !!record?.breakStartTime;

    // ── Break reminder ───────────────────────────────────────────────
    if (!onBreak && nowMin >= breakReminderAt && nowMin < checkoutReminderAt && logType(employee.id, "break_reminder")) {
      notifyEmployee(employee,
        "⏰ Wanago Workspace",
        `It's time for your break at ${policy.breakTime}. Current time is ${now}.`);
      counts.breakReminder++;
    }

    // ── Check-out reminder ───────────────────────────────────────────
    if (nowMin >= checkoutReminderAt && logType(employee.id, "checkout_reminder")) {
      notifyEmployee(employee,
        "⏰ Wanago Workspace",
        `It's time to check out at ${policy.workEndTime}. Current time is ${now}.`);
      counts.checkoutReminder++;
    }

    // ── Break overrun (warning to employee, escalation to admin+manager) ─
    if (onBreak && record?.breakStartTime) {
      const elapsed = ((nowMin - minutesOf(record.breakStartTime)) % 1440 + 1440) % 1440;
      if (elapsed > policy.breakAllowanceMinutes && logType(employee.id, "break_overrun_warning")) {
        notifyEmployee(employee,
          "⚠️ Break time exceeded",
          "Your break has run over the allowed time — please return to work as soon as possible.");
        counts.breakOverrunWarning++;
      }
      if (elapsed > policy.breakAllowanceMinutes + BREAK_OVERRUN_ESCALATION_BUFFER_MIN && logType(employee.id, "break_overrun_escalation")) {
        escalate(employee,
          "⚠️ Break overrun",
          `${employee.fullName}'s break has run ${elapsed - policy.breakAllowanceMinutes} minutes over the ${policy.breakAllowanceMinutes}-minute allowance and they haven't returned.`);
        counts.breakOverrunEscalation++;
      }
    }

    // ── Missing checkout escalation ──────────────────────────────────
    if (nowMin >= checkoutMissingEscalateAt && logType(employee.id, "checkout_missing_escalation")) {
      escalate(employee,
        "⚠️ Not checked out",
        `${employee.fullName} is still checked in past ${policy.workEndTime} (now ${now}) with no check-out recorded.`);
      counts.checkoutMissingEscalation++;
    }
  }

  await Promise.all([...logWrites, ...notifyTasks]);

  return NextResponse.json({ ok: true, today, now, ...counts });
}
