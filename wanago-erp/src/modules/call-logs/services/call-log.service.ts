import { where, type QueryConstraint } from "firebase/firestore";
import { callLogRepository } from "@/modules/call-logs/services/call-log.repository";
import { toDate } from "@/lib/utils/helpers";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import { uploadFile } from "@/lib/storage/upload";
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
  const refNumber = await nextRefNumber("CALL");

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
  const url = await uploadFile(`callLogs/${callLogId}/recording-${Date.now()}-${file.name}`, file);
  await callLogRepository.update(callLogId, { recordingFileUrl: url } as Partial<CallLog>);
  return url;
}
