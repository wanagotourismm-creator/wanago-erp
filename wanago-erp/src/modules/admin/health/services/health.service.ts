import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { fetchRecentActivity } from "@/lib/activity-log";
import type { Timestamp } from "@/types/global";

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
  lastActivityAt: Timestamp | Date | string | null;
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

  // Was previously `String(recent[0].createdAt)` — a Firestore Timestamp's
  // toString() isn't a format formatDate()/date-fns can parse, so this
  // crashed with "RangeError: Invalid time value" the moment any real
  // activity existed. Dormant until now: the activities collection's
  // writes were themselves being silently rejected by a Firestore rule
  // (see the activity-log fix), so this path never had real data to
  // trigger it. Fixed by keeping the original Timestamp/Date/string value
  // instead of stringifying it.
  let lastActivityAt: Timestamp | Date | string | null = null;
  try {
    const recent = await fetchRecentActivity(1);
    if (recent[0]) lastActivityAt = recent[0].createdAt;
  } catch {
    // leave as null
  }

  return { collections, lastActivityAt };
}
