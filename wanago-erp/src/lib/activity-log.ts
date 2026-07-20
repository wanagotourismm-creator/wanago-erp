import { addDoc, collection, serverTimestamp, orderBy, query, limit, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Timestamp } from "@/types/global";

export type ActivityAction = "created" | "updated" | "deleted" | "status_changed";

export type ActivityLogEntry = {
  id:         string;
  entityType: string;
  entityName: string;
  action:     ActivityAction;
  detail:     string;
  actorId:    string;
  actorName:  string;
  createdAt:  Timestamp | Date | string;
};

export async function logActivity(entry: {
  entityType: string;
  entityName: string;
  action:     ActivityAction;
  detail:     string;
  actorId:    string;
  actorName:  string;
}): Promise<void> {
  try {
    await addDoc(collection(db, FIRESTORE_COLLECTIONS.ACTIVITIES), {
      ...entry,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Activity logging must never block the primary action.
  }
}

export async function fetchRecentActivity(max = 100): Promise<ActivityLogEntry[]> {
  const q = query(collection(db, FIRESTORE_COLLECTIONS.ACTIVITIES), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ActivityLogEntry);
}

// Scoped to one actor's own activity — unlike fetchRecentActivity (admin/HR
// only per firestore.rules, an unfiltered query can't be proven safe for a
// plain employee), this filters server-side via a `where` the rules can
// verify against resource.data.actorId, so a non-admin/HR employee (e.g.
// ESS's "My Activity" tab) can read their own trail without needing the
// broad audit-log permission.
export async function fetchRecentActivityByActor(actorId: string, max = 100): Promise<ActivityLogEntry[]> {
  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.ACTIVITIES),
    where("actorId", "==", actorId),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ActivityLogEntry);
}
