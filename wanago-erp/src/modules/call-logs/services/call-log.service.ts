import { where, type QueryConstraint } from "firebase/firestore";
import { collection, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";
import { callLogRepository } from "@/modules/call-logs/services/call-log.repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { generateRefNumber, toDate } from "@/lib/utils/helpers";
import type { CallLog, CallLogFormData } from "@/modules/call-logs/types";

// Sorted client-side (not via Firestore orderBy) so filtered queries only
// need single-field indexes, which Firestore creates automatically — no
// manual composite index deployment required. Matches the convention
// already used across this codebase (see expense.service.ts).
export async function fetchCallLogs(filters: {
  leadId?:     string;
  customerId?: string;
}): Promise<CallLog[]> {
  const constraints: QueryConstraint[] = [];
  if (filters.leadId)     constraints.push(where("leadId",     "==", filters.leadId));
  if (filters.customerId) constraints.push(where("customerId", "==", filters.customerId));
  const callLogs = await callLogRepository.findMany({ constraints });
  return callLogs.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export async function createCallLog(
  data: CallLogFormData,
  createdBy: string,
  loggedBy: string,
  loggedByName: string
): Promise<CallLog> {
  const existing = await getDocs(collection(db, FIRESTORE_COLLECTIONS.CALL_LOGS));
  const ids       = existing.docs.map(d => d.data().refNumber ?? "");
  const refNumber = generateRefNumber("CALL", ids);

  return callLogRepository.create({
    ...data,
    refNumber,
    createdBy,
    status:       "logged",
    leadId:       data.leadId     ?? null,
    customerId:   data.customerId ?? null,
    durationMinutes: data.durationMinutes ?? null,
    notes:        data.notes        || null,
    followUpDate: data.followUpDate || null,
    loggedBy,
    loggedByName,
    recordingFileUrl: null,
    // TODO: auto-populate via telephony webhook once a provider
    // (Exotel/Knowlarity) is connected.
    recordingUrl: null,
  });
}

export async function uploadCallRecording(callLogId: string, file: File): Promise<string> {
  const storageRef = ref(storage, `callLogs/${callLogId}/recording-${Date.now()}-${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await callLogRepository.update(callLogId, { recordingFileUrl: url } as Partial<CallLog>);
  return url;
}
