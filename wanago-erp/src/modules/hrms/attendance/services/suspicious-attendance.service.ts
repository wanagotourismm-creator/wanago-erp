import { orderBy, serverTimestamp } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { auth } from "@/lib/firebase/client";
import type { SuspiciousAttendanceAttempt } from "@/modules/hrms/shared/types";

class SuspiciousAttendanceRepository extends BaseRepository<SuspiciousAttendanceAttempt> {
  constructor() { super(FIRESTORE_COLLECTIONS.HRMS_SUSPICIOUS_ATTENDANCE); }
}
const repo = new SuspiciousAttendanceRepository();

export async function fetchSuspiciousAttempts(): Promise<SuspiciousAttendanceAttempt[]> {
  return repo.findMany({ constraints: [orderBy("createdAt", "desc")] });
}

export async function fetchSuspiciousAttemptsByEmployee(employeeId: string): Promise<SuspiciousAttendanceAttempt[]> {
  return repo.findMany({ constraints: [orderBy("createdAt", "desc")] })
    .then((rows) => rows.filter((r) => r.employeeId === employeeId));
}

export async function markSuspiciousAttemptReviewed(id: string, reviewedBy: string): Promise<void> {
  return repo.update(id, {
    reviewed: true,
    reviewedBy,
    reviewedAt: serverTimestamp(),
  } as Partial<SuspiciousAttendanceAttempt>);
}

export async function deleteSuspiciousAttempt(id: string): Promise<void> {
  return repo.delete(id);
}

// Goes through /api/hrms/attendance/reinstate (Admin SDK) rather than a
// direct Firestore write — firestore.rules' users/{userId} update rule
// only lets isAdmin() flip isActive directly, which would leave HR (who
// this review page is otherwise built for) unable to click this at all.
// The route itself re-checks hrms:manage server-side and only ever touches
// accounts it auto-suspended, so this can't be repurposed to reactivate an
// unrelated manually-deactivated account.
export async function reinstateEmployee(userId: string): Promise<{ error: string | null }> {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return { error: "Not signed in" };
    const res = await fetch("/api/hrms/attendance/reinstate", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error || "Failed to reinstate account" };
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to reinstate account" };
  }
}
