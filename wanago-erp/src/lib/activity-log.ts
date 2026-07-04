import { addDoc, collection, serverTimestamp, orderBy, query, limit, getDocs } from "firebase/firestore";
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
