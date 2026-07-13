import { where, doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { toDate } from "@/lib/utils/helpers";
import type { FormResponse, FormResponseFormData } from "@/modules/forms/types";

class FormResponseRepository extends BaseRepository<FormResponse> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.FORM_RESPONSES);
  }
}
const formResponseRepository = new FormResponseRepository();

export async function fetchFormResponses(formId: string): Promise<FormResponse[]> {
  const responses = await formResponseRepository.findMany({ constraints: [where("formId", "==", formId)] });
  return responses.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

// Internal-form submission only — filled by an already-authenticated staff
// member inside the dashboard, so this goes through the normal client SDK
// like everything else in the app. Public forms submit via the token-gated
// /api/public/forms/{token} route instead (no Firestore write access for an
// anonymous visitor).
export async function submitFormResponse(data: FormResponseFormData, createdBy: string): Promise<FormResponse> {
  const response = await formResponseRepository.create({
    ...data,
    createdBy,
    status: "active",
  });
  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.FORMS, data.formId), { responseCount: increment(1) });
  return response;
}
