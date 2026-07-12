import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { TeamPulseResponseSchema } from "@/modules/team-pulse/schemas";
import type { TeamPulseAggregate } from "@/modules/team-pulse/types";

// Monday of the current week, same "weekOf" convention as the digests —
// this is what rounds are keyed by, computed client-side (no need for
// server precision on a survey window).
export function getCurrentRoundId(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - daysSinceMonday);
  return monday.toISOString().slice(0, 10);
}

function docIdFor(roundId: string, uid: string): string {
  return `${roundId}_${uid}`;
}

export async function hasSubmittedThisRound(uid: string): Promise<boolean> {
  const roundId = getCurrentRoundId();
  const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.TEAM_PULSE_RESPONSES, docIdFor(roundId, uid)));
  return snap.exists();
}

export async function submitPulseResponse(data: TeamPulseResponseSchema, uid: string): Promise<void> {
  const roundId = getCurrentRoundId();
  await setDoc(doc(db, FIRESTORE_COLLECTIONS.TEAM_PULSE_RESPONSES, docIdFor(roundId, uid)), {
    roundId,
    sentiment: data.sentiment,
    comment: data.comment || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: uid,
    status: "active",
  }, { merge: true });
}

// Aggregate-only — see /api/team-pulse/results for why this never returns
// per-response data.
export async function fetchAggregate(roundId: string): Promise<TeamPulseAggregate | null> {
  try {
    const res = await fetch(`/api/team-pulse/results?roundId=${encodeURIComponent(roundId)}`);
    if (!res.ok) return null;
    return (await res.json()) as TeamPulseAggregate;
  } catch {
    return null;
  }
}
