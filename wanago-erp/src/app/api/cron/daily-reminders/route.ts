import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { notifyUserServer } from "@/lib/server/notify-server";
import { LEAD_STAGES, FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

const STALE_DAYS = 5; // matches the convention already used in MySalesProgress.tsx
const DAY_MS = 24 * 60 * 60 * 1000;

type AdminTimestamp = { toMillis: () => number };
function toMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === "object" && "toMillis" in value) return (value as AdminTimestamp).toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") { const t = new Date(value).getTime(); return Number.isNaN(t) ? null : t; }
  return null;
}

type LeadDoc = {
  id: string; name: string; destination: string;
  stage: string; assignedTo: string | null; createdAt: unknown;
};
type CallLogDoc = {
  id: string; leadId: string | null; customerId: string | null;
  contactName: string; phone: string; createdAt: unknown; createdBy: string;
  followUpNeeded: boolean; followUpDate: string | null;
};
type EmployeeDoc = { id: string; userId?: string | null; email: string | null };
type UserDoc = { id: string; email: string };

// Verified daily by Vercel Cron (see vercel.json) — a bearer-token check is
// this route's only defense, since it has no other auth context. Reads
// everything via the Admin SDK (bypassing security rules entirely, same
// pattern as src/lib/firebase/admin.ts's other server-only helpers) since
// there's no signed-in user in a cron invocation for the client SDK to
// authenticate as.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 500 });
  }

  const [leadsSnap, callLogsSnap, employeesSnap, usersSnap] = await Promise.all([
    db.collection(FIRESTORE_COLLECTIONS.LEADS).get(),
    db.collection(FIRESTORE_COLLECTIONS.CALL_LOGS).get(),
    db.collection(FIRESTORE_COLLECTIONS.HRMS_EMPLOYEES).get(),
    db.collection(FIRESTORE_COLLECTIONS.USERS).get(),
  ]);

  const leads     = leadsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as LeadDoc);
  const callLogs  = callLogsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as CallLogDoc);
  const employeeById = new Map(employeesSnap.docs.map(d => [d.id, ({ id: d.id, ...d.data() }) as EmployeeDoc]));
  const userById      = new Map(usersSnap.docs.map(d => [d.id, ({ id: d.id, ...d.data() }) as UserDoc]));

  // Most recent call log per lead, used as "last real contact" since
  // Lead.lastContactedAt is never actually written anywhere in the app.
  const lastCallByLead = new Map<string, number>();
  for (const log of callLogs) {
    if (!log.leadId) continue;
    const t = toMillis(log.createdAt);
    if (t == null) continue;
    const prev = lastCallByLead.get(log.leadId);
    if (!prev || t > prev) lastCallByLead.set(log.leadId, t);
  }

  const now = Date.now();
  let leadsNotified = 0;

  for (const lead of leads) {
    if (lead.stage === LEAD_STAGES.WON || lead.stage === LEAD_STAGES.LOST) continue;
    if (!lead.assignedTo) continue;

    const lastActivity = lastCallByLead.get(lead.id) ?? toMillis(lead.createdAt);
    if (lastActivity == null) continue;
    const daysSince = (now - lastActivity) / DAY_MS;
    if (daysSince < STALE_DAYS) continue;

    const employee = employeeById.get(lead.assignedTo);
    if (!employee?.userId) continue;
    const user = userById.get(employee.userId);

    await notifyUserServer({
      userId:   employee.userId,
      email:    user?.email ?? employee.email ?? null,
      title:    `Lead going cold: ${lead.name}`,
      body:     `${lead.name} (${lead.destination}) hasn't been contacted in ${Math.floor(daysSince)} days. Give them a call?`,
      link:     "/leads",
      category: "followup",
    });
    leadsNotified++;
  }

  let followUpsNotified = 0;
  const todayStr = new Date().toISOString().slice(0, 10);

  for (const log of callLogs) {
    if (!log.followUpNeeded || !log.followUpDate) continue;
    if (log.followUpDate > todayStr) continue; // still in the future
    if (!log.createdBy) continue;

    const user = userById.get(log.createdBy);
    await notifyUserServer({
      userId:   log.createdBy,
      email:    user?.email ?? null,
      title:    `Follow-up due: ${log.contactName}`,
      body:     `You have a follow-up due for ${log.contactName} (${log.phone}) from your call on ${log.followUpDate}.`,
      link:     log.leadId ? "/leads" : "/customers",
      category: "followup",
    });
    followUpsNotified++;
  }

  return NextResponse.json({ ok: true, leadsNotified, followUpsNotified });
}
