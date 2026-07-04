import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { fetchRecentActivity } from "@/lib/activity-log";

export type CollectionHealth = {
  label:   string;
  key:     string;
  count:   number | null;
  ok:      boolean;
  error?:  string;
};

const CHECKED_COLLECTIONS: { label: string; key: string }[] = [
  { label: "Leads",       key: FIRESTORE_COLLECTIONS.LEADS },
  { label: "Customers",   key: FIRESTORE_COLLECTIONS.CUSTOMERS },
  { label: "Bookings",    key: FIRESTORE_COLLECTIONS.BOOKINGS },
  { label: "Invoices",    key: FIRESTORE_COLLECTIONS.INVOICES },
  { label: "Payments",    key: FIRESTORE_COLLECTIONS.PAYMENTS },
  { label: "Users",       key: FIRESTORE_COLLECTIONS.USERS },
  { label: "Offices",     key: FIRESTORE_COLLECTIONS.OFFICES },
  { label: "HRMS Employees", key: FIRESTORE_COLLECTIONS.HRMS_EMPLOYEES },
  { label: "HRMS Payroll",   key: FIRESTORE_COLLECTIONS.HRMS_PAYROLL },
  { label: "HRMS Leaves",    key: FIRESTORE_COLLECTIONS.HRMS_LEAVES },
  { label: "Activity Log",  key: FIRESTORE_COLLECTIONS.ACTIVITIES },
];

export async function checkSystemHealth(): Promise<{
  collections: CollectionHealth[];
  lastActivityAt: string | null;
}> {
  const collections = await Promise.all(
    CHECKED_COLLECTIONS.map(async (c): Promise<CollectionHealth> => {
      try {
        const snap = await getCountFromServer(collection(db, c.key));
        return { label: c.label, key: c.key, count: snap.data().count, ok: true };
      } catch (e) {
        return { label: c.label, key: c.key, count: null, ok: false, error: e instanceof Error ? e.message : "Failed to query" };
      }
    })
  );

  let lastActivityAt: string | null = null;
  try {
    const recent = await fetchRecentActivity(1);
    if (recent[0]) lastActivityAt = String(recent[0].createdAt);
  } catch {
    // leave as null
  }

  return { collections, lastActivityAt };
}
