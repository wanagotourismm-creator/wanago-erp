import { where } from "firebase/firestore";
import { uploadFile } from "@/lib/storage/upload";
import { auth } from "@/lib/firebase/client";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { toDate } from "@/lib/utils/helpers";
import type { HrPolicyDocument } from "@/modules/hrms/policies/types";

class HrPolicyRepository extends BaseRepository<HrPolicyDocument> {
  constructor() { super(FIRESTORE_COLLECTIONS.HR_POLICY_DOCUMENTS); }
}
const repo = new HrPolicyRepository();

export async function fetchHrPolicyDocuments(activeOnly = false): Promise<HrPolicyDocument[]> {
  const docs = await repo.findMany({
    constraints: activeOnly ? [where("docStatus", "==", "active")] : [],
  });
  return docs.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

// Uploads the PDF to Supabase Storage (same proxy every other upload in
// the app uses), creates the Firestore record immediately with
// extractedText null, then asks the server to read the PDF and fill it in
// — two steps rather than one so the document shows up in the list right
// away ("Extracting..." state) instead of the UI blocking on a full
// Gemini call before the upload even appears to have succeeded.
export async function uploadHrPolicyDocument(title: string, file: File): Promise<{ error: string | null }> {
  try {
    const fileUrl = await uploadFile(`hr-policies/${Date.now()}-${file.name}`, file);
    const doc = await repo.create({
      title, fileUrl,
      extractedText: null,
      extractionError: null,
      docStatus: "active",
      createdBy: auth.currentUser?.uid ?? "",
    } as unknown as Omit<HrPolicyDocument, "id" | "createdAt" | "updatedAt">);

    const idToken = await auth.currentUser?.getIdToken();
    await fetch("/api/hrms/policies/extract", {
      method: "POST",
      headers: { "content-type": "application/json", ...(idToken ? { authorization: `Bearer ${idToken}` } : {}) },
      body: JSON.stringify({ documentId: doc.id }),
    }).catch(() => {});

    return { error: null };
  } catch {
    return { error: "Upload failed — please try again." };
  }
}

export async function archiveHrPolicyDocument(id: string, docStatus: "active" | "archived"): Promise<void> {
  return repo.update(id, { docStatus });
}

export async function deleteHrPolicyDocument(id: string): Promise<void> {
  return repo.delete(id);
}
