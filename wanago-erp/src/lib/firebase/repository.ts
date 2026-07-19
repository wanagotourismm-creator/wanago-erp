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
import type { ZodType } from "zod";
import { db, auth } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { logInvalidDocument } from "@/lib/firebase/schemas";
import type { FirestoreRecord } from "@/types/global";

export type QueryOptions = {
  constraints?: QueryConstraint[];
  pageSize?:    number;
  lastDoc?:     DocumentData | null;
};

// ── Base Repository ───────────────────────────────────────────
export class BaseRepository<T extends FirestoreRecord> {
  protected readonly collectionName: string;
  // Optional per-module document schema (extend firestoreRecordSchema —
  // see src/lib/firebase/schemas.ts). Repositories that don't pass one keep
  // today's unvalidated `as T` cast; this is opt-in so modules can migrate
  // incrementally (see PRD Pillar 1, "Zod-validated Firestore reads").
  private readonly schema?: ZodType<unknown>;

  constructor(collectionName: string, schema?: ZodType<unknown>) {
    this.collectionName = collectionName;
    this.schema = schema;
  }

  protected ref() {
    return collection(db, this.collectionName);
  }

  protected docRef(id: string) {
    return doc(db, this.collectionName, id);
  }

  // Validates a raw Firestore doc against this repository's schema (if any)
  // before it ever reaches a component. Invalid docs are logged and
  // dropped — never thrown, never rendered raw.
  private hydrate(id: string, data: DocumentData): T | null {
    const raw = { id, ...data };
    if (!this.schema) return raw as T;
    const result = this.schema.safeParse(raw);
    if (!result.success) {
      logInvalidDocument(this.collectionName, id, result.error);
      return null;
    }
    return result.data as T;
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
    return this.hydrate(snap.id, snap.data());
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
    return snap.docs
      .map((d) => this.hydrate(d.id, d.data()))
      .filter((doc): doc is T => doc !== null);
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
  // Soft-deletes: the document is copied into a "trash" collection
  // (so it can be restored from the Admin panel) before being removed
  // from its original collection. Trash entries older than 30 days
  // can be safely purged, but nothing does so automatically yet.
  async delete(id: string): Promise<void> {
    if (this.collectionName !== FIRESTORE_COLLECTIONS.TRASH) {
      const snap = await getDoc(this.docRef(id));
      if (snap.exists()) {
        // The generic Firestore rule validates create/update writes via
        // hasRequiredFields() — this trash copy needs those same fields
        // or it gets silently rejected, leaving the original undeleted.
        await addDoc(collection(db, FIRESTORE_COLLECTIONS.TRASH), {
          collectionName: this.collectionName,
          originalId:     snap.id,
          data:           snap.data(),
          deletedAt:      serverTimestamp(),
          createdAt:      serverTimestamp(),
          updatedAt:      serverTimestamp(),
          createdBy:      auth.currentUser?.uid ?? "system",
          status:         "trashed",
        });
      }
    }
    await deleteDoc(this.docRef(id));
  }

  // ── Real-time listener ────────────────────────────────────
  subscribe(
    constraints: QueryConstraint[],
    callback: (items: T[]) => void
  ): Unsubscribe {
    const q: Query = query(this.ref(), ...constraints);
    return onSnapshot(q, (snap) => {
      const items = snap.docs
        .map((d) => this.hydrate(d.id, d.data()))
        .filter((doc): doc is T => doc !== null);
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
