import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
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

export async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    const [leadsSnap, bookingsSnap, invoicesSnap] = await Promise.all([
      getDocs(collection(db, FIRESTORE_COLLECTIONS.LEADS)),
      getDocs(collection(db, FIRESTORE_COLLECTIONS.BOOKINGS)),
      getDocs(collection(db, FIRESTORE_COLLECTIONS.INVOICES)),
    ]);

    const leads    = leadsSnap.docs.map(d => d.data());
    const bookings = bookingsSnap.docs.map(d => d.data());
    const invoices = invoicesSnap.docs.map(d => d.data());

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
      pendingDues,
      overdueInvoices,
      newLeads,
      followUpPending,
    };
  } catch {
    return {
      totalRevenue:      0,
      activeLeads:       0,
      confirmedBookings: 0,
      pendingDues:       0,
      overdueInvoices:   0,
      newLeads:          0,
      followUpPending:   0,
    };
  }
}

export async function fetchLeadPipeline(): Promise<LeadPipelineItem[]> {
  try {
    const snap = await getDocs(collection(db, FIRESTORE_COLLECTIONS.LEADS));
    const leads = snap.docs.map(d => d.data());

    return Object.values(LEAD_STAGES).map(stage => ({
      stage,
      count: leads.filter(l => l.stage === stage).length,
      color: PIPELINE_COLORS[stage] ?? "#888",
    }));
  } catch {
    return Object.values(LEAD_STAGES).map(stage => ({
      stage,
      count: 0,
      color: PIPELINE_COLORS[stage] ?? "#888",
    }));
  }
}

export async function fetchRevenueData(): Promise<RevenueDataPoint[]> {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  try {
    const snap = await getDocs(collection(db, FIRESTORE_COLLECTIONS.PAYMENTS));
    const payments = snap.docs.map(d => d.data());

    return months.map((month, i) => ({
      month,
      amount: payments
        .filter(p => {
          const d = p.createdAt?.toDate?.();
          return d && d.getMonth() === i;
        })
        .reduce((sum, p) => sum + (p.amount ?? 0), 0),
    }));
  } catch {
    return months.map(month => ({ month, amount: 0 }));
  }
}
