import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { notifyUserServer } from "@/lib/server/notify-server";
import { fetchUsersByPermission } from "@/lib/notify-recipients";
import { computeGoingColdCustomers, computeBookingAnomalies } from "@/modules/dashboard/services/insights.service";
import { LEAD_STAGES, INVOICE_STATUS, FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Booking } from "@/modules/bookings/types";

export const runtime = "nodejs";

const STALE_DAYS = 5; // matches the convention already used in MySalesProgress.tsx
const QUOTATION_STALE_DAYS = 5; // same threshold as stale leads, for consistency
const QUOTATION_EXPIRY_WARNING_DAYS = 2;
const FINANCE_APPROVAL_STUCK_DAYS = 3;
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
type UserDoc = { id: string; email: string; systemRole?: string };
type QuotationDoc = {
  id: string; refNumber: string; customerName: string; status: string;
  validUntil: string | null; createdBy: string; updatedAt: unknown; createdAt: unknown;
  financeApprovalStatus: string;
};
type InvoiceDoc = {
  id: string; refNumber: string; customerName: string; status: string;
  balanceDue: number; createdBy: string;
};
type CustomerDoc = { id: string; fullName: string; assignedTo: string | null };

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

  const [leadsSnap, callLogsSnap, employeesSnap, usersSnap, quotationsSnap, invoicesSnap, bookingsSnap, customersSnap] = await Promise.all([
    db.collection(FIRESTORE_COLLECTIONS.LEADS).get(),
    db.collection(FIRESTORE_COLLECTIONS.CALL_LOGS).get(),
    db.collection(FIRESTORE_COLLECTIONS.HRMS_EMPLOYEES).get(),
    db.collection(FIRESTORE_COLLECTIONS.USERS).get(),
    db.collection(FIRESTORE_COLLECTIONS.QUOTATIONS).get(),
    db.collection(FIRESTORE_COLLECTIONS.INVOICES).where("status", "==", INVOICE_STATUS.OVERDUE).get(),
    db.collection(FIRESTORE_COLLECTIONS.BOOKINGS).get(),
    db.collection(FIRESTORE_COLLECTIONS.CUSTOMERS).get(),
  ]);

  const leads       = leadsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as LeadDoc);
  const callLogs     = callLogsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as CallLogDoc);
  const employeeById = new Map(employeesSnap.docs.map(d => [d.id, ({ id: d.id, ...d.data() }) as EmployeeDoc]));
  const userById      = new Map(usersSnap.docs.map(d => [d.id, ({ id: d.id, ...d.data() }) as UserDoc]));
  const quotations   = quotationsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as QuotationDoc);
  const overdueInvoices = invoicesSnap.docs.map(d => ({ id: d.id, ...d.data() }) as InvoiceDoc);
  const bookings     = bookingsSnap.docs.map(d => d.data()) as unknown as Booking[];
  const customerById = new Map(customersSnap.docs.map(d => [d.id, ({ id: d.id, ...d.data() }) as CustomerDoc]));

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

  // ── Quotation expiring/expired ───────────────────────────────────────
  // Only "sent" quotations carry a live validUntil the customer is
  // actually waiting on — draft/accepted/rejected/converted don't need this.
  let quotationsExpiringNotified = 0;
  for (const q of quotations) {
    if (q.status !== "sent" || !q.validUntil || !q.createdBy) continue;
    const validUntilMs = new Date(q.validUntil).getTime();
    if (Number.isNaN(validUntilMs)) continue;
    const daysUntilExpiry = (validUntilMs - now) / DAY_MS;
    if (daysUntilExpiry > QUOTATION_EXPIRY_WARNING_DAYS) continue;

    const user = userById.get(q.createdBy);
    const isExpired = daysUntilExpiry < 0;
    await notifyUserServer({
      userId:   q.createdBy,
      email:    user?.email ?? null,
      title:    isExpired ? `Quotation expired: ${q.refNumber}` : `Quotation expiring soon: ${q.refNumber}`,
      body:     isExpired
        ? `${q.customerName}'s quotation ${q.refNumber} expired on ${q.validUntil} — follow up or issue a fresh one.`
        : `${q.customerName}'s quotation ${q.refNumber} expires on ${q.validUntil} — follow up before it lapses.`,
      link:     "/quotations",
      category: "followup",
    });
    quotationsExpiringNotified++;
  }

  // ── Quotation stale (sent, no response in QUOTATION_STALE_DAYS+) ────
  let quotationsStaleNotified = 0;
  for (const q of quotations) {
    if (q.status !== "sent" || !q.createdBy) continue;
    const updatedAtMs = toMillis(q.updatedAt);
    if (updatedAtMs == null) continue;
    const daysSince = (now - updatedAtMs) / DAY_MS;
    if (daysSince < QUOTATION_STALE_DAYS) continue;

    const user = userById.get(q.createdBy);
    await notifyUserServer({
      userId:   q.createdBy,
      email:    user?.email ?? null,
      title:    `No response on quotation ${q.refNumber}`,
      body:     `${q.customerName} hasn't responded to quotation ${q.refNumber} in ${Math.floor(daysSince)} days. Worth a follow-up call?`,
      link:     "/quotations",
      category: "followup",
    });
    quotationsStaleNotified++;
  }

  // ── Quotation stuck in pending Finance approval ─────────────────────
  let financeApprovalsStuckNotified = 0;
  const stuckQuotations = quotations.filter(q => {
    if (q.financeApprovalStatus !== "pending") return false;
    const createdAtMs = toMillis(q.createdAt);
    if (createdAtMs == null) return false;
    return (now - createdAtMs) / DAY_MS >= FINANCE_APPROVAL_STUCK_DAYS;
  });
  if (stuckQuotations.length > 0) {
    const approvers = await fetchUsersByPermission("quotations:finance_approve");
    for (const approver of approvers) {
      await notifyUserServer({
        userId:   approver.id,
        email:    approver.email,
        title:    `${stuckQuotations.length} quotation(s) awaiting your approval`,
        body:     `${stuckQuotations.map(q => q.refNumber).join(", ")} — pending Finance approval for ${FINANCE_APPROVAL_STUCK_DAYS}+ days.`,
        link:     "/approvals",
        category: "approval",
      });
    }
    financeApprovalsStuckNotified = stuckQuotations.length;
  }

  // ── Invoice overdue, per-invoice ────────────────────────────────────
  let invoicesOverdueNotified = 0;
  for (const inv of overdueInvoices) {
    if (!inv.createdBy) continue;
    const user = userById.get(inv.createdBy);
    await notifyUserServer({
      userId:   inv.createdBy,
      email:    user?.email ?? null,
      title:    `Invoice overdue: ${inv.refNumber}`,
      body:     `${inv.customerName}'s invoice ${inv.refNumber} is overdue — ₹${inv.balanceDue} outstanding.`,
      link:     "/invoices",
      category: "followup",
    });
    invoicesOverdueNotified++;
  }

  // ── Going-cold customer → notify their assigned agent ───────────────
  let goingColdNotified = 0;
  const goingCold = computeGoingColdCustomers(bookings, 50);
  for (const c of goingCold) {
    const customer = customerById.get(c.customerId);
    if (!customer?.assignedTo) continue;
    const employee = employeeById.get(customer.assignedTo);
    if (!employee?.userId) continue;
    const user = userById.get(employee.userId);

    await notifyUserServer({
      userId:   employee.userId,
      email:    user?.email ?? employee.email ?? null,
      title:    `${c.customerName} may be going cold`,
      body:     `${c.customerName} usually books every ~${c.avgGapDays} days but hasn't booked in ${c.daysSinceLast} — worth reaching out?`,
      link:     "/customers",
      category: "followup",
    });
    goingColdNotified++;
  }

  // ── Booking anomaly → notify admin/ops same day it's detected ──────
  let anomaliesNotified = 0;
  const anomalies = computeBookingAnomalies(bookings);
  if (anomalies.length > 0) {
    const adminUsers = Array.from(userById.values()).filter(u => u.systemRole === "admin" || u.systemRole === "super_admin" || u.systemRole === "operations");
    for (const admin of adminUsers) {
      await notifyUserServer({
        userId:   admin.id,
        email:    admin.email,
        title:    "Booking anomaly detected",
        body:     anomalies.map(a => a.message).join(" "),
        link:     "/dashboard",
        category: "system",
      });
    }
    anomaliesNotified = anomalies.length;
  }

  return NextResponse.json({
    ok: true,
    leadsNotified,
    followUpsNotified,
    quotationsExpiringNotified,
    quotationsStaleNotified,
    financeApprovalsStuckNotified,
    invoicesOverdueNotified,
    goingColdNotified,
    anomaliesNotified,
  });
}
