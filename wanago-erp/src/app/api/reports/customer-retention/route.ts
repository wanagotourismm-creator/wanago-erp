import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrFinance } from "@/lib/firebase/admin";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export const runtime = "nodejs";

const DAY_MS = 24 * 60 * 60 * 1000;
const EXCLUDED_STATUSES = new Set(["cancelled", "finance_rejected", "ops_rejected"]);

type SupaCustomer = { id: string; created_at: string };
type SupaBooking = { id: string; customer_id: string; created_at: string; status: string };

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

function cohortMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// "Booked again" = a customer's SECOND real booking (their first is how
// most customers become a Customer record in the first place, often the
// same day via quotation conversion — counting it would make almost
// every customer look "retained" on day one). Measured as days from the
// customer's own signup date to their second booking's date, not from
// today — this is a signup-cohort retention curve, not a snapshot.
export async function GET(req: NextRequest) {
  const caller = await requireAdminOrFinance(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });

  const [customersRes, bookingsRes] = await Promise.all([
    supabase.from("reporting_customers").select("id, created_at"),
    supabase.from("reporting_bookings").select("id, customer_id, created_at, status"),
  ]);
  if (customersRes.error) return NextResponse.json({ error: customersRes.error.message }, { status: 502 });
  if (bookingsRes.error)  return NextResponse.json({ error: bookingsRes.error.message },  { status: 502 });

  const customers = (customersRes.data ?? []) as SupaCustomer[];
  const bookings   = (bookingsRes.data  ?? []) as SupaBooking[];

  const bookingsByCustomer = new Map<string, SupaBooking[]>();
  for (const b of bookings) {
    if (EXCLUDED_STATUSES.has(b.status)) continue;
    const list = bookingsByCustomer.get(b.customer_id) ?? [];
    list.push(b);
    bookingsByCustomer.set(b.customer_id, list);
  }
  for (const list of bookingsByCustomer.values()) {
    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  type Cohort = { month: string; newCustomers: number; rebooked90: number; rebooked180: number };
  const cohorts = new Map<string, Cohort>();

  for (const customer of customers) {
    const month = cohortMonth(customer.created_at);
    const cohort = cohorts.get(month) ?? { month, newCustomers: 0, rebooked90: 0, rebooked180: 0 };
    cohort.newCustomers++;

    const secondBooking = bookingsByCustomer.get(customer.id)?.[1];
    if (secondBooking) {
      const daysToRebook = (new Date(secondBooking.created_at).getTime() - new Date(customer.created_at).getTime()) / DAY_MS;
      if (daysToRebook <= 90)  cohort.rebooked90++;
      if (daysToRebook <= 180) cohort.rebooked180++;
    }
    cohorts.set(month, cohort);
  }

  const result = Array.from(cohorts.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(c => ({
      ...c,
      pct90:  c.newCustomers ? (c.rebooked90  / c.newCustomers) * 100 : 0,
      pct180: c.newCustomers ? (c.rebooked180 / c.newCustomers) * 100 : 0,
    }));

  return NextResponse.json({ cohorts: result });
}
