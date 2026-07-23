import { collection, getDocs, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS, LEAD_STAGES, BOOKING_STATUS } from "@/lib/constants";
import { toDate, formatCurrency } from "@/lib/utils/helpers";
import { dateRangesOverlap } from "@/modules/resources/services/conflict.service";
import type {
  DashboardStats, LeadPipelineItem, RevenueDataPoint,
  CockpitAlert, CockpitFilters,
} from "@/modules/dashboard/types";

type CockpitStats = Pick<
  DashboardStats, "cashPosition" | "grossMarginPct" | "pipelineValue" | "arOverdueAmount"
>;

const PIPELINE_COLORS: Record<string, string> = {
  new:         "#22c55e",
  contacted:   "#3b82f6",
  follow_up:   "#f59e0b",
  quoted:      "#8b5cf6",
  negotiation: "#f97316",
  won:         "#134a32",
  lost:        "#ef4444",
};

// Leads and Bookings are each fetched exactly once per dashboard load —
// by useDashboard() — and the raw arrays are shared into these pure
// compute functions plus TopPerformers, instead of each dashboard piece
// independently re-fetching the same full collection (previously:
// Bookings was fetched in full 3 separate times — here, TopPerformers,
// and DepartingSoon — and Leads twice, on every single dashboard render).
export function computeDashboardStats(
  leads: DocumentData[], bookings: DocumentData[], invoices: DocumentData[]
): Omit<DashboardStats, keyof CockpitStats> {
  const activeLeads = leads.filter(
    l => !["won", "lost"].includes(l.stage)
  ).length;

  const newLeads = leads.filter(l => l.stage === LEAD_STAGES.NEW).length;

  const followUpPending = leads.filter(
    l => l.stage === LEAD_STAGES.FOLLOW_UP
  ).length;

  const confirmedBookings = bookings.filter(
    b => b.status === BOOKING_STATUS.CONFIRMED
  ).length;

  const totalRevenue = bookings
    .filter(b => b.status === BOOKING_STATUS.COMPLETED)
    .reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);

  const pendingDues = invoices
    .filter(i => ["partial", "unpaid", "overdue"].includes(i.status))
    .reduce((sum, i) => sum + (i.balanceDue ?? 0), 0);

  const overdueInvoices = invoices.filter(i => i.status === "overdue").length;

  return {
    totalRevenue,
    activeLeads,
    confirmedBookings,
    pendingDues,
    overdueInvoices,
    newLeads,
    followUpPending,
    totalLeads: leads.length,
  };
}

export function computeLeadPipeline(leads: DocumentData[]): LeadPipelineItem[] {
  return Object.values(LEAD_STAGES).map(stage => ({
    stage,
    count: leads.filter(l => l.stage === stage).length,
    color: PIPELINE_COLORS[stage] ?? "#888",
  }));
}

// Fetches Leads, Bookings, Invoices, Payments, and Expenses — once each —
// for useDashboard() to share across computeDashboardStats/computeLeadPipeline,
// the cockpit compute functions below, and (for Bookings) TopPerformers.
// Falls back to empty arrays on failure so callers can still render
// zeroed-out stats rather than crash.
export async function fetchDashboardRawData(): Promise<{
  leads: DocumentData[]; bookings: DocumentData[]; invoices: DocumentData[];
  payments: DocumentData[]; expenses: DocumentData[];
  resources: DocumentData[]; resourceAssignments: DocumentData[]; resourceBlackouts: DocumentData[];
}> {
  try {
    const [leadsSnap, bookingsSnap, invoicesSnap, paymentsSnap, expensesSnap, resourcesSnap, assignmentsSnap, blackoutsSnap] = await Promise.all([
      getDocs(collection(db, FIRESTORE_COLLECTIONS.LEADS)),
      getDocs(collection(db, FIRESTORE_COLLECTIONS.BOOKINGS)),
      getDocs(collection(db, FIRESTORE_COLLECTIONS.INVOICES)),
      getDocs(collection(db, FIRESTORE_COLLECTIONS.PAYMENTS)),
      getDocs(collection(db, FIRESTORE_COLLECTIONS.EXPENSES)),
      getDocs(collection(db, FIRESTORE_COLLECTIONS.RESOURCES)),
      getDocs(collection(db, FIRESTORE_COLLECTIONS.RESOURCE_ASSIGNMENTS)),
      getDocs(collection(db, FIRESTORE_COLLECTIONS.RESOURCE_BLACKOUTS)),
    ]);
    return {
      leads:    leadsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      bookings: bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      invoices: invoicesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      payments: paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      expenses: expensesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      resources:           resourcesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      resourceAssignments: assignmentsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      resourceBlackouts:   blackoutsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    };
  } catch (err) {
    console.error("[dashboard.service] fetchDashboardRawData failed — showing zeroed stats:", err);
    return { leads: [], bookings: [], invoices: [], payments: [], expenses: [], resources: [], resourceAssignments: [], resourceBlackouts: [] };
  }
}

// ── Executive cockpit ─────────────────────────────────────────
// Reads live data straight off existing module collections (no GL/BI
// engine exists yet — see the TODO on DashboardStats). Every function
// below is a pure fold over already-fetched arrays so they're cheap to
// unit-test and re-run whenever CockpitFilters change.

function inOffice(doc: DocumentData, officeId: CockpitFilters["officeId"]): boolean {
  return officeId === "all" || doc.officeId === officeId;
}

function inFilterRange(doc: DocumentData, filters: CockpitFilters): boolean {
  if (!inOffice(doc, filters.officeId)) return false;
  const d = toDate(doc.createdAt);
  if (!d) return true; // no date on the doc — don't silently exclude it
  return d >= filters.rangeStart && d <= filters.rangeEnd;
}

export function computeCashPosition(
  payments: DocumentData[], expenses: DocumentData[], filters: CockpitFilters
): number {
  const cashIn = payments
    .filter(p => inFilterRange(p, filters))
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const cashOut = expenses
    .filter(e => e.expenseStatus === "paid" && inFilterRange(e, filters))
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);
  return cashIn - cashOut;
}

export function computeGrossMargin(bookings: DocumentData[], filters: CockpitFilters): number | null {
  const eligible = bookings.filter(
    b => (b.status === BOOKING_STATUS.CONFIRMED || b.status === BOOKING_STATUS.COMPLETED) &&
         typeof b.profitAmount === "number" &&
         inFilterRange(b, filters)
  );
  if (eligible.length === 0) return null;
  const totalRevenue = eligible.reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);
  const totalProfit  = eligible.reduce((sum, b) => sum + (b.profitAmount ?? 0), 0);
  if (totalRevenue === 0) return null;
  return (totalProfit / totalRevenue) * 100;
}

export function computePipelineValue(leads: DocumentData[], officeId: CockpitFilters["officeId"]): number {
  return leads
    .filter(l => l.stage !== LEAD_STAGES.WON && l.stage !== LEAD_STAGES.LOST && inOffice(l, officeId))
    .reduce((sum, l) => sum + (l.budget ?? 0), 0);
}

export function computeArOverdue(invoices: DocumentData[], officeId: CockpitFilters["officeId"]): number {
  return invoices
    .filter(i => i.status === "overdue" && inOffice(i, officeId))
    .reduce((sum, i) => sum + (i.balanceDue ?? 0), 0);
}

export function computeCockpitStats(
  data: { bookings: DocumentData[]; payments: DocumentData[]; expenses: DocumentData[]; leads: DocumentData[]; invoices: DocumentData[] },
  filters: CockpitFilters
): CockpitStats {
  return {
    cashPosition:    computeCashPosition(data.payments, data.expenses, filters),
    grossMarginPct:  computeGrossMargin(data.bookings, filters),
    pipelineValue:   computePipelineValue(data.leads, filters.officeId),
    arOverdueAmount: computeArOverdue(data.invoices, filters.officeId),
  };
}

const RESOURCE_AVAILABILITY_HORIZON_DAYS = 7;

// One alert per (type, office) where every active resource of that kind
// has at least one assignment/blackout overlapping the coming week — a
// conservative, cheap-to-compute signal (not full day-by-day precision)
// that the whole category is tight, not just one resource.
export function computeResourceAvailabilityAlerts(
  resources: DocumentData[], assignments: DocumentData[], blackouts: DocumentData[], now: Date = new Date()
): CockpitAlert[] {
  const horizonEnd = new Date(now.getTime() + RESOURCE_AVAILABILITY_HORIZON_DAYS * 24 * 60 * 60 * 1000);
  const range = { startDate: now.toISOString().slice(0, 10), endDate: horizonEnd.toISOString().slice(0, 10) };

  const groups = new Map<string, DocumentData[]>();
  for (const r of resources) {
    if (!r.isActive) continue;
    const key = `${r.type}::${r.officeId}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  const alerts: CockpitAlert[] = [];
  for (const [key, groupResources] of groups) {
    const [type, officeId] = key.split("::");
    const allBusy = groupResources.every((r) =>
      assignments.some((a) => a.resourceId === r.id && dateRangesOverlap(range, a as { startDate: string; endDate: string })) ||
      blackouts.some((b) => b.resourceId === r.id && dateRangesOverlap(range, b as { startDate: string; endDate: string }))
    );
    if (!allBusy) continue;
    const officeName = groupResources[0].officeName ?? officeId;
    alerts.push({
      id:       `low_resource_availability_${key}`,
      type:     "low_resource_availability",
      title:    `No ${type.replace("_", " ")}s free this week`,
      detail:   `Every active ${type.replace("_", " ")} at ${officeName} has a booking or blackout in the next ${RESOURCE_AVAILABILITY_HORIZON_DAYS} days`,
      href:     "/resources",
      severity: "medium",
    });
  }
  return alerts;
}

// Alert feed — reads live off existing module data, same as the rest of
// the cockpit (no BI/alerting engine exists). resources/assignments/
// blackouts default to [] so existing callers (and tests) that only pass
// invoices/bookings keep working unchanged.
export function computeCockpitAlerts(
  invoices: DocumentData[], bookings: DocumentData[],
  resources: DocumentData[] = [], resourceAssignments: DocumentData[] = [], resourceBlackouts: DocumentData[] = []
): CockpitAlert[] {
  const alerts: CockpitAlert[] = [];

  for (const inv of invoices) {
    if (inv.status !== "overdue") continue;
    alerts.push({
      id:       `overdue_invoice_${inv.id}`,
      type:     "overdue_invoice",
      title:    `Overdue invoice ${inv.refNumber ?? ""}`.trim(),
      detail:   `${inv.customerName ?? "Customer"} — ${formatCurrency(inv.balanceDue ?? 0)} outstanding`,
      href:     `/invoices?view=${inv.id}`,
      severity: "high",
    });
  }

  for (const b of bookings) {
    if (typeof b.profitAmount !== "number" || b.profitAmount >= 0) continue;
    alerts.push({
      id:       `negative_margin_booking_${b.id}`,
      type:     "negative_margin_booking",
      title:    `Negative-margin booking ${b.refNumber ?? ""}`.trim(),
      detail:   `${b.customerName ?? "Customer"} — ${formatCurrency(b.profitAmount)} profit`,
      href:     `/bookings?view=${b.id}`,
      severity: "medium",
    });
  }

  alerts.push(...computeResourceAvailabilityAlerts(resources, resourceAssignments, resourceBlackouts));

  return alerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;
    return 0;
  });
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Rolling 12-month window ending at the current month, each bucket keyed
// by actual year+month — previously bucketed by month NAME only (no
// year), so every January across every year got summed into one "Jan"
// bucket. Harmless with under a year of history; actively wrong (and
// silently so — the chart just renders confident-looking bad numbers)
// once the business has a second year of payments.
export async function fetchRevenueData(): Promise<RevenueDataPoint[]> {
  const now = new Date();
  const buckets: { year: number; monthIndex: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ year: d.getFullYear(), monthIndex: d.getMonth() });
  }

  function label(b: { year: number; monthIndex: number }): string {
    return `${MONTH_NAMES[b.monthIndex]} ${String(b.year).slice(2)}`;
  }

  try {
    const snap = await getDocs(collection(db, FIRESTORE_COLLECTIONS.PAYMENTS));
    const payments = snap.docs.map(d => d.data());

    return buckets.map((b) => ({
      month: label(b),
      amount: payments
        .filter(p => {
          const d = p.createdAt?.toDate?.();
          return d && d.getFullYear() === b.year && d.getMonth() === b.monthIndex;
        })
        .reduce((sum, p) => sum + (p.amount ?? 0), 0),
    }));
  } catch (err) {
    console.error("[dashboard.service] fetchRevenueData failed — showing a flat ₹0 chart:", err);
    return buckets.map(b => ({ month: label(b), amount: 0 }));
  }
}
