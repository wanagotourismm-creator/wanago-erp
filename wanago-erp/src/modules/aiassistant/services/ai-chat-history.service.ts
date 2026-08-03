// Persistent memory for the AI Assistant chat — previously every open of
// the panel started from an empty transcript (useAIAssistant's `messages`
// state had no backing store). Raw client-SDK calls rather than
// BaseRepository: this is ephemeral personal chat history, not a business
// record, so it deliberately skips BaseRepository's soft-delete-to-trash
// behavior on every delete() — clearing chat history should just delete it.
import {
  collection, addDoc, doc, getDocs, query, where, orderBy, limit, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export type StoredChatMessage = { id: string; role: "user" | "assistant"; content: string };

const MAX_HISTORY = 30;

export async function fetchRecentHistory(uid: string): Promise<StoredChatMessage[]> {
  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.AI_CHAT_HISTORY),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(MAX_HISTORY)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, role: d.data().role as "user" | "assistant", content: d.data().content as string }))
    .reverse();
}

export async function saveChatMessage(uid: string, role: "user" | "assistant", content: string): Promise<void> {
  if (!content.trim()) return;
  try {
    await addDoc(collection(db, FIRESTORE_COLLECTIONS.AI_CHAT_HISTORY), {
      uid, role, content: content.slice(0, 2000), createdAt: serverTimestamp(),
    });
  } catch {
    // best-effort — a failed save should never break the chat itself
  }
}

export async function clearChatHistory(uid: string): Promise<void> {
  const q = query(collection(db, FIRESTORE_COLLECTIONS.AI_CHAT_HISTORY), where("uid", "==", uid));
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(doc(db, FIRESTORE_COLLECTIONS.AI_CHAT_HISTORY, d.id)));
  await batch.commit();
}
