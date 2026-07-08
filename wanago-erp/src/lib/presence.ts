import { doc, setDoc, serverTimestamp, collection, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { toDate } from "@/lib/utils/helpers";

// A user reads as "online" if their heartbeat landed within this window.
// Firestore has no onDisconnect hook (that's Realtime Database only), so
// there's no way to detect a closed tab instantly — a stopped heartbeat is
// the only signal, hence this small grace window rather than an instant flip.
const HEARTBEAT_INTERVAL_MS = 25_000;
const ONLINE_THRESHOLD_MS = 60_000;

// Writes a "last seen" heartbeat for `uid` every 25s for as long as the
// caller keeps the app open. Returns a cleanup function that stops it.
export function startPresenceHeartbeat(uid: string): () => void {
  const beat = () => {
    setDoc(doc(db, FIRESTORE_COLLECTIONS.TEAMSPACE_PRESENCE, uid), { lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
  };
  beat();
  const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS);
  return () => clearInterval(interval);
}

export type PresenceMap = Record<string, { online: boolean; lastSeen: unknown }>;

export function subscribeToPresence(callback: (map: PresenceMap) => void): Unsubscribe {
  return onSnapshot(collection(db, FIRESTORE_COLLECTIONS.TEAMSPACE_PRESENCE), (snap) => {
    const map: PresenceMap = {};
    const now = Date.now();
    snap.docs.forEach((d) => {
      const lastSeen = d.data().lastSeen;
      const seenMs = toDate(lastSeen)?.getTime() ?? 0;
      map[d.id] = { online: now - seenMs < ONLINE_THRESHOLD_MS, lastSeen };
    });
    callback(map);
  });
}
