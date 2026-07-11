import { collection, getDocs, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS, LEAD_STAGES, BOOKING_STATUS } from "@/lib/constants";
import type { DashboardStats, LeadPipelineItem, RevenueDataPoint } from "@/modules/dashboard/types";

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
): DashboardStats {
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

// Fetches Leads, Bookings, and Invoices — once each — for useDashboard()
// to share across computeDashboardStats/computeLeadPipeline and (for
// Bookings) TopPerformers. Falls back to empty arrays on failure so
// callers can still render zeroed-out stats rather than crash.
export async function fetchDashboardRawData(): Promise<{
  leads: DocumentData[]; bookings: DocumentData[]; invoices: DocumentData[];
}> {
  try {
    const [leadsSnap, bookingsSnap, invoicesSnap] = await Promise.all([
      getDocs(collection(db, FIRESTORE_COLLECTIONS.LEADS)),
      getDocs(collection(db, FIRESTORE_COLLECTIONS.BOOKINGS)),
      getDocs(collection(db, FIRESTORE_COLLECTIONS.INVOICES)),
    ]);
    return {
      leads:    leadsSnap.docs.map(d => d.data()),
      bookings: bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      invoices: invoicesSnap.docs.map(d => d.data()),
    };
  } catch (err) {
    console.error("[dashboard.service] fetchDashboardRawData failed — showing zeroed stats:", err);
    return { leads: [], bookings: [], invoices: [] };
  }
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
