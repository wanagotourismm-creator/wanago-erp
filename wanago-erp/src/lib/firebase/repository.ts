import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  onSnapshot,
  type Query,
  type DocumentData,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { FirestoreRecord } from "@/types/global";

export type QueryOptions = {
  constraints?: QueryConstraint[];
  pageSize?:    number;
  lastDoc?:     DocumentData | null;
};

// ── Base Repository ───────────────────────────────────────────
export class BaseRepository<T extends FirestoreRecord> {
  protected readonly collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  protected ref() {
    return collection(db, this.collectionName);
  }

  protected docRef(id: string) {
    return doc(db, this.collectionName, id);
  }

  // ── Create ────────────────────────────────────────────────
  async create(data: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T> {
    const docRef = await addDoc(this.ref(), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { ...data, id: docRef.id } as T;
  }

  // ── Read one ──────────────────────────────────────────────
  async findById(id: string): Promise<T | null> {
    const snap = await getDoc(this.docRef(id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as T;
  }

  // ── Read many ─────────────────────────────────────────────
  async findMany(options: QueryOptions = {}): Promise<T[]> {
    const constraints: QueryConstraint[] = [
      ...(options.constraints ?? []),
    ];

    if (options.pageSize) {
      constraints.push(limit(options.pageSize));
    }

    if (options.lastDoc) {
      constraints.push(startAfter(options.lastDoc));
    }

    const q: Query = query(this.ref(), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
  }

  // ── Update ────────────────────────────────────────────────
  async update(id: string, data: Partial<T>): Promise<void> {
    const { id: _id, createdAt: _ca, ...rest } = data as Record<string, unknown>;
    void _id; void _ca;
    await updateDoc(this.docRef(id), {
      ...rest,
      updatedAt: serverTimestamp(),
    });
  }

  // ── Delete ────────────────────────────────────────────────
  async delete(id: string): Promise<void> {
    await deleteDoc(this.docRef(id));
  }

  // ── Real-time listener ────────────────────────────────────
  subscribe(
    constraints: QueryConstraint[],
    callback: (items: T[]) => void
  ): Unsubscribe {
    const q: Query = query(this.ref(), ...constraints);
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
      callback(items);
    });
  }

  // ── Helpers ───────────────────────────────────────────────
  protected whereOffice(officeId: string): QueryConstraint {
    return where("officeId", "==", officeId);
  }

  protected whereStatus(status: string): QueryConstraint {
    return where("status", "==", status);
  }

  protected orderByCreated(dir: "asc" | "desc" = "desc"): QueryConstraint {
    return orderBy("createdAt", dir);
  }
}
