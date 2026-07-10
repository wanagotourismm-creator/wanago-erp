import { orderBy, serverTimestamp } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { SuspiciousAttendanceAttempt } from "@/modules/hrms/shared/types";
import type { SuspicionReason } from "@/lib/geo-fraud";

class SuspiciousAttendanceRepository extends BaseRepository<SuspiciousAttendanceAttempt> {
  constructor() { super(FIRESTORE_COLLECTIONS.HRMS_SUSPICIOUS_ATTENDANCE); }
}
const repo = new SuspiciousAttendanceRepository();

export async function fetchSuspiciousAttempts(): Promise<SuspiciousAttendanceAttempt[]> {
  return repo.findMany({ constraints: [orderBy("createdAt", "desc")] });
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
  return repo.create({
    ...data,
    reviewed: false,
    reviewedBy: null,
    reviewedAt: null,
    status: "active",
    createdBy,
  });
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
