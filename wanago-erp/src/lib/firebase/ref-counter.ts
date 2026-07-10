import { doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { REF_FORMATS } from "@/lib/constants";

// Generates the next sequential reference number for a prefix (e.g.
// "BOOKING" -> "WGO-1002") via a Firestore transaction against a dedicated
// counter document. The previous approach — read every existing document
// of that type, take the highest number, add one — was a classic
// non-atomic read-then-write: two people creating a record of the same
// type at the same moment could both read the same "current max" and both
// write the same next ref number, producing duplicates. A transaction
// retries on conflict so the counter always advances by exactly one per
// call, even under concurrent creates.
export async function nextRefNumber(prefix: keyof typeof REF_FORMATS): Promise<string> {
  const pfx = REF_FORMATS[prefix];
  const counterRef = doc(db, "refCounters", pfx);
  const next = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? (snap.data().next as number) : 1001;
    tx.set(counterRef, { next: current + 1 });
    return current;
  });
  return `${pfx}-${next}`;
}
