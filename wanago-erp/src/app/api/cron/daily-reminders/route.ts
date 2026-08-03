import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { notifyUserServer, sendInvoicePaymentReminderEmail } from "@/lib/server/notify-server";
import { sendWhatsAppSmart } from "@/lib/whatsapp/template-router";
import { fetchUsersByPermission } from "@/lib/notify-recipients";
import { computeGoingColdCustomers, computeBookingAnomalies, getQuotationRisk } from "@/modules/dashboard/services/insights.service";
import { getTicketSlaStatus } from "@/modules/tickets/services/ticket-sla.service";
import { isPreDepartureDueSoon, isStuckPastTravelDate, isClosureStuck, PRE_DEPARTURE_DUE_WITHIN_DAYS, CLOSURE_STUCK_DAYS } from "@/modules/tour-operations/utils";
import { LEAD_STAGES, INVOICE_STATUS, FIRESTORE_COLLECTIONS, WHATSAPP_TEMPLATE_PURPOSES } from "@/lib/constants";
import type { Booking } from "@/modules/bookings/types";
import type { OperationsBooking } from "@/modules/tour-operations/types";
import type { TicketSlaPolicy } from "@/modules/tickets/services/ticket-sla-policy.service";

export const runtime = "nodejs";

const STALE_DAYS = 5; // matches the convention already used in MySalesProgress.tsx
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
  customerId: string; customerPhone: string; dueDate: string | null;
};
type CustomerDoc = { id: string; fullName: string; assignedTo: string | null; email: string | null };
type TicketDoc = {
  id: string; refNumber: string; title: string; priority: "low" | "medium" | "high" | "urgent";
  ticketStatus: "open" | "in_progress" | "resolved" | "closed";
  assignedToId: string | null; createdAt: unknown; firstRespondedAt: unknown; resolvedAt: unknown;
};

// Small, duplicated on purpose (matches this cron's existing convention —
// see STALE_DAYS above) rather than importing DEFAULT_TICKET_SLA_POLICY as
// a value from ticket-sla-policy.service.ts, which would pull in the
// client Firestore SDK (that file's fetch/update functions use `db` from
// lib/firebase/client) into a route that must stay Admin-SDK-only, per
// this file's own comment on why every read here uses getAdminDb().
const DEFAULT_TICKET_SLA_HOURS: TicketSlaPolicy = {
  responseHours:   { urgent: 1, high: 4,  medium: 24, low: 48  },
  resolutionHours: { urgent: 4, high: 24, medium: 72, low: 168 },
};

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

  const [leadsSnap, callLogsSnap, employeesSnap, usersSnap, quotationsSnap, invoicesSnap, bookingsSnap, customersSnap, ticketsSnap, ticketSlaPolicySnap, opsBookingsSnap] = await Promise.all([
    db.collection(FIRESTORE_COLLECTIONS.LEADS).get(),
    db.collection(FIRESTORE_COLLECTIONS.CALL_LOGS).get(),
    db.collection(FIRESTORE_COLLECTIONS.HRMS_EMPLOYEES).get(),
    db.collection(FIRESTORE_COLLECTIONS.USERS).get(),
    db.collection(FIRESTORE_COLLECTIONS.QUOTATIONS).get(),
    db.collection(FIRESTORE_COLLECTIONS.INVOICES).where("status", "==", INVOICE_STATUS.OVERDUE).get(),
    db.collection(FIRESTORE_COLLECTIONS.BOOKINGS).get(),
    db.collection(FIRESTORE_COLLECTIONS.CUSTOMERS).get(),
    db.collection(FIRESTORE_COLLECTIONS.TICKETS).where("ticketStatus", "in", ["open", "in_progress"]).get(),
    db.collection(FIRESTORE_COLLECTIONS.SETTINGS).doc("ticketSlaPolicy").get(),
    db.collection(FIRESTORE_COLLECTIONS.OPERATIONS_BOOKINGS).get(),
  ]);

  const leads       = leadsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as LeadDoc);
  const callLogs     = callLogsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as CallLogDoc);
  const employeeById = new Map(employeesSnap.docs.map(d => [d.id, ({ id: d.id, ...d.data() }) as EmployeeDoc]));
  const userById      = new Map(usersSnap.docs.map(d => [d.id, ({ id: d.id, ...d.data() }) as UserDoc]));
  const quotations   = quotationsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as QuotationDoc);
  const overdueInvoices = invoicesSnap.docs.map(d => ({ id: d.id, ...d.data() }) as InvoiceDoc);
  const bookings     = bookingsSnap.docs.map(d => d.data()) as unknown as Booking[];
  const customerById = new Map(customersSnap.docs.map(d => [d.id, ({ id: d.id, ...d.data() }) as CustomerDoc]));
  const openTickets  = ticketsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as TicketDoc);
  // Same reuse-the-pure-function convention as getQuotationRisk/
  // computeBookingAnomalies/getTicketSlaStatus above — the client
  // OperationsBooking type matches what's actually stored, Admin SDK
  // Timestamps have the same {seconds,...} shape toDate() already handles.
  const opsBookings = opsBookingsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as unknown as OperationsBooking[];
  const ticketSlaPolicyData = ticketSlaPolicySnap.data() as Partial<TicketSlaPolicy> | undefined;
  const ticketSlaPolicy: TicketSlaPolicy = {
    responseHours:   { ...DEFAULT_TICKET_SLA_HOURS.responseHours,   ...(ticketSlaPolicyData?.responseHours   ?? {}) },
    resolutionHours: { ...DEFAULT_TICKET_SLA_HOURS.resolutionHours, ...(ticketSlaPolicyData?.resolutionHours ?? {}) },
  };

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
  const leadIds = new Set(leads.map(l => l.id));

  for (const log of callLogs) {
    if (!log.followUpNeeded || !log.followUpDate) continue;
    if (log.followUpDate > todayStr) continue; // still in the future
    if (!log.createdBy) continue;
    // A call log outlives the lead/customer it was logged against — deleting
    // either doesn't touch callLogs (see deleteLead()), so without this check
    // a stale follow-up fires every single day forever, for a contact that no
    // longer exists anywhere in the UI.
    if (log.leadId && !leadIds.has(log.leadId)) continue;
    if (log.customerId && !customerById.has(log.customerId)) continue;

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

  // ── Quotation expiring/expired/stale ────────────────────────────────
  // getQuotationRisk (src/modules/dashboard/services/insights.service.ts)
  // is the single shared definition — the Quotations table badges use the
  // exact same function, so what this cron notifies and what the table
  // shows can never quietly drift apart.
  let quotationsExpiringNotified = 0;
  let quotationsStaleNotified = 0;
  for (const q of quotations) {
    if (!q.createdBy) continue;
    const risk = getQuotationRisk(q);
    if (!risk) continue;

    const user = userById.get(q.createdBy);
    if (risk.type === "stale") {
      const daysSince = Math.floor((now - (toMillis(q.updatedAt) ?? now)) / DAY_MS);
      await notifyUserServer({
        userId:   q.createdBy,
        email:    user?.email ?? null,
        title:    `No response on quotation ${q.refNumber}`,
        body:     `${q.customerName} hasn't responded to quotation ${q.refNumber} in ${daysSince} days. Worth a follow-up call?`,
        link:     "/quotations",
        category: "followup",
      });
      quotationsStaleNotified++;
    } else {
      const isExpired = risk.type === "expired";
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
  }

  // ── Quotation stuck in pending Operations approval ───────────────────
  // Moved from Finance to Operations — see quotation.service.ts's
  // notifyOpsApprovers/approveQuotationOperations.
  let financeApprovalsStuckNotified = 0;
  const stuckQuotations = quotations.filter(q => {
    if (q.financeApprovalStatus !== "pending") return false;
    const createdAtMs = toMillis(q.createdAt);
    if (createdAtMs == null) return false;
    return (now - createdAtMs) / DAY_MS >= FINANCE_APPROVAL_STUCK_DAYS;
  });
  if (stuckQuotations.length > 0) {
    const approvers = await fetchUsersByPermission("quotations:ops_approve");
    for (const approver of approvers) {
      await notifyUserServer({
        userId:   approver.id,
        email:    approver.email,
        title:    `${stuckQuotations.length} quotation(s) awaiting your approval`,
        body:     `${stuckQuotations.map(q => q.refNumber).join(", ")} — pending Operations approval for ${FINANCE_APPROVAL_STUCK_DAYS}+ days.`,
        link:     "/operations-approvals",
        category: "approval",
      });
    }
    financeApprovalsStuckNotified = stuckQuotations.length;
  }

  // ── Invoice overdue, per-invoice ────────────────────────────────────
  // Milestone days (not "every day it's overdue") so the customer gets a
  // nudge at sensible checkpoints instead of the same email daily forever —
  // computed purely from dueDate, no extra "last reminded" field needed.
  const CUSTOMER_REMINDER_MILESTONE_DAYS = [1, 7, 14, 30];
  let invoicesOverdueNotified = 0;
  let customerPaymentRemindersSent = 0;
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

    // Customer-facing reminder — previously only staff were ever notified
    // about an overdue invoice, never the customer who actually owes the
    // money. Email is the reliable channel (Gmail SMTP, already proven);
    // WhatsApp only fires if an admin has since registered+approved a Meta
    // template for this purpose (sendWhatsAppSmart returns {ok:false}
    // otherwise, which is fine — this whole block is best-effort).
    const dueDateMs = inv.dueDate ? toMillis(inv.dueDate) : null;
    const daysOverdue = dueDateMs != null ? Math.floor((now - dueDateMs) / DAY_MS) : null;
    if (daysOverdue != null && CUSTOMER_REMINDER_MILESTONE_DAYS.includes(daysOverdue)) {
      const customer = customerById.get(inv.customerId);
      try {
        const results = await Promise.all([
          inv.customerPhone
            ? sendWhatsAppSmart({
                to: inv.customerPhone,
                purpose: WHATSAPP_TEMPLATE_PURPOSES.INVOICE_PAYMENT_REMINDER,
                variables: [inv.customerName, inv.refNumber, String(inv.balanceDue)],
                fallbackBody: `Hi ${inv.customerName}, invoice ${inv.refNumber} has ₹${inv.balanceDue} outstanding. Please get in touch to settle it.`,
              })
            : Promise.resolve({ ok: false }),
          customer?.email
            ? sendInvoicePaymentReminderEmail({
                to: customer.email, customerName: inv.customerName, refNumber: inv.refNumber,
                balanceDue: inv.balanceDue, dueDate: inv.dueDate,
              })
            : Promise.resolve({ ok: false }),
        ]);
        if (results.some((r) => r.ok)) customerPaymentRemindersSent++;
      } catch {
        // Best-effort — a failed customer nudge must never break the
        // staff-facing notification above, which has already succeeded.
      }
    }
  }

  // ── Ticket SLA breach → notify the assignee (or admins if unassigned) ──
  // getTicketSlaStatus (ticket-sla.service.ts) is the same shared function
  // the Tickets table/detail-modal badges use — cron and UI can't drift.
  // Only fires once per breach, not every day it stays breached: gated on
  // the due time having fallen within the last 24h (this cron's own
  // cadence) rather than a persisted "already notified" field.
  let ticketSlaBreachesNotified = 0;
  for (const t of openTickets) {
    const sla = getTicketSlaStatus(t, ticketSlaPolicy, new Date(now));
    const justBreached: string[] = [];
    if (sla.response.status === "breached" && now - sla.response.dueAt.getTime() <= DAY_MS) justBreached.push("first response");
    if (sla.resolution.status === "breached" && now - sla.resolution.dueAt.getTime() <= DAY_MS) justBreached.push("resolution");
    if (justBreached.length === 0) continue;

    const title = `SLA breached: ${t.refNumber}`;
    const body = `"${t.title}" (${t.priority} priority) has missed its ${justBreached.join(" and ")} SLA.`;
    const assigneeEmployee = t.assignedToId ? employeeById.get(t.assignedToId) : null;

    if (assigneeEmployee?.userId) {
      const user = userById.get(assigneeEmployee.userId);
      await notifyUserServer({
        userId: assigneeEmployee.userId, email: user?.email ?? assigneeEmployee.email ?? null,
        title, body, link: "/admin", category: "followup",
      });
    } else {
      const adminUsers = Array.from(userById.values()).filter(u => u.systemRole === "admin" || u.systemRole === "super_admin");
      for (const admin of adminUsers) {
        await notifyUserServer({ userId: admin.id, email: admin.email, title, body, link: "/admin", category: "followup" });
      }
    }
    ticketSlaBreachesNotified++;
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

  // ── Tour Operations: pre-departure due, stuck past travel date, closure
  // stuck ──────────────────────────────────────────────────────────────
  // isPreDepartureDueSoon/isStuckPastTravelDate/isClosureStuck (shared
  // with the Operations dashboard's stat tiles — see useTourOperationsStats.ts)
  // are the same functions, so what this notifies and what the dashboard
  // shows can't drift apart. This whole module had zero automation until
  // now — nothing else here notifies Operations about any of these.
  let tourOpsRemindersNotified = 0;
  const opsRoleUsers = Array.from(userById.values()).filter(
    u => u.systemRole === "admin" || u.systemRole === "super_admin" || u.systemRole === "operations"
  );
  const preDepartureDue = opsBookings.filter(r => isPreDepartureDueSoon(r, PRE_DEPARTURE_DUE_WITHIN_DAYS));
  const stuckPastTravel = opsBookings.filter(isStuckPastTravelDate);
  const closureStuck    = opsBookings.filter(r => isClosureStuck(r, CLOSURE_STUCK_DAYS));

  if (preDepartureDue.length + stuckPastTravel.length + closureStuck.length > 0) {
    const lines: string[] = [];
    if (preDepartureDue.length > 0) lines.push(`${preDepartureDue.length} trip(s) traveling within ${PRE_DEPARTURE_DUE_WITHIN_DAYS} days still have an incomplete pre-departure checklist: ${preDepartureDue.map(r => r.refNumber).join(", ")}.`);
    if (stuckPastTravel.length > 0) lines.push(`${stuckPastTravel.length} trip(s) have a travel date in the past but were never marked as started: ${stuckPastTravel.map(r => r.refNumber).join(", ")}.`);
    if (closureStuck.length > 0) lines.push(`${closureStuck.length} completed trip(s) have been stuck in closure for ${CLOSURE_STUCK_DAYS}+ days without finishing: ${closureStuck.map(r => r.refNumber).join(", ")}.`);

    for (const opsUser of opsRoleUsers) {
      await notifyUserServer({
        userId:   opsUser.id,
        email:    opsUser.email,
        title:    "Tour Operations needs attention",
        body:     lines.join(" "),
        link:     "/operations",
        category: "followup",
      });
    }
    tourOpsRemindersNotified = preDepartureDue.length + stuckPastTravel.length + closureStuck.length;
  }

  return NextResponse.json({
    ok: true,
    leadsNotified,
    followUpsNotified,
    quotationsExpiringNotified,
    quotationsStaleNotified,
    financeApprovalsStuckNotified,
    invoicesOverdueNotified,
    customerPaymentRemindersSent,
    ticketSlaBreachesNotified,
    goingColdNotified,
    anomaliesNotified,
    tourOpsRemindersNotified,
  });
}
