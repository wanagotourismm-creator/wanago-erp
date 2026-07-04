import {
  collection, doc, getDocs, deleteDoc, setDoc, query, orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { TrashEntry } from "@/modules/admin/trash/types";

export async function fetchTrash(): Promise<TrashEntry[]> {
  const q = query(collection(db, FIRESTORE_COLLECTIONS.TRASH), orderBy("deletedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as TrashEntry);
}

// Restores the document at its ORIGINAL id, so anything that referenced
// it (e.g. a booking pointing at a customerId) still resolves correctly.
export async function restoreFromTrash(entry: TrashEntry): Promise<void> {
  await setDoc(doc(db, entry.collectionName, entry.originalId), entry.data);
  await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.TRASH, entry.id));
}

export async function permanentlyDelete(entryId: string): Promise<void> {
  await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.TRASH, entryId));
}
