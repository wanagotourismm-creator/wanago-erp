import { collection, getDocs, query, limit as fbLimit, deleteDoc, doc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export type RawDoc = {
  id:   string;
  data: Record<string, unknown>;
};

export const EXPLORABLE_COLLECTIONS: { label: string; key: string }[] = Object.entries(FIRESTORE_COLLECTIONS)
  .filter(([key]) => key !== "TRASH")
  .map(([key, value]) => ({
    label: key.replace(/_/g, " ").replace(/\w\S*/g, w => w.charAt(0) + w.slice(1).toLowerCase()),
    key: value,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

export async function fetchCollectionDocs(collectionName: string, max = 100): Promise<RawDoc[]> {
  const q = query(collection(db, collectionName), fbLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, data: d.data() }));
}

// Deletes directly through the same soft-delete path as everywhere
// else — copies to trash first, then removes the original.
export async function deleteExplorerDoc(collectionName: string, id: string): Promise<void> {
  const ref = doc(db, collectionName, id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await addDoc(collection(db, FIRESTORE_COLLECTIONS.TRASH), {
      collectionName,
      originalId: id,
      data: snap.data(),
      deletedAt: serverTimestamp(),
    });
  }
  await deleteDoc(ref);
}
