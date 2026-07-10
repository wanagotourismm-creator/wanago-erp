import { orderBy, serverTimestamp } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { notifyUser } from "@/lib/notify";
import { fetchUsersByPermission } from "@/lib/notify-recipients";
import { SUSPICION_REASON_LABELS, type SuspicionReason } from "@/lib/geo-fraud";
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

// Notifications are best-effort — a failure here must never block the
// check-in/out flow that's already been rejected for the employee.
async function notifyHrOfSuspiciousAttempt(data: {
  employeeName: string;
  officeName: string;
  action: "check_in" | "check_out";
  reasons: SuspicionReason[];
}): Promise<void> {
  try {
    const recipients = await fetchUsersByPermission("hrms:manage");
    const reasonText = data.reasons.map((r) => SUSPICION_REASON_LABELS[r] ?? r).join("; ");
    await Promise.all(
      recipients.map((u) =>
        notifyUser({
          userId:   u.id,
          email:    u.email,
          title:    `Suspicious ${data.action === "check_in" ? "check-in" : "check-out"} blocked — ${data.employeeName}`,
          body:     `${data.employeeName} at ${data.officeName}: ${reasonText}`,
          link:     "/hrms-admin",
          category: "system",
        })
      )
    );
  } catch {
    // ignore — this is an alert, not the record of the event itself
  }
}

export async function logSuspiciousAttempt(data: {
  employeeId: string;
  employeeName: string;
  officeId: string;
  officeName: string;
  action: "check_in" | "check_out";
  lat: number;
  lng: number;
  accuracy: number | null;
  reasons: SuspicionReason[];
}, createdBy: string): Promise<SuspiciousAttendanceAttempt> {
  const attempt = await repo.create({
    ...data,
    reviewed: false,
    reviewedBy: null,
    reviewedAt: null,
    status: "active",
    createdBy,
  });
  notifyHrOfSuspiciousAttempt(data).catch(() => {});
  return attempt;
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
