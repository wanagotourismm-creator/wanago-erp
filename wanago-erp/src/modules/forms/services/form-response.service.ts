import { where, doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { toDate } from "@/lib/utils/helpers";
import { createNotification } from "@/modules/notifications/services/notification.service";
import { createLead } from "@/modules/leads/services/lead.service";
import { buildLeadDraftFromAnswers } from "@/modules/forms/utils/actions";
import type { Form, FormResponse, FormResponseFormData } from "@/modules/forms/types";

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

// Runs the form's configured Phase 3 auto-actions (notify + auto-create
// lead) after a response is recorded. Best-effort — a failure here must
// never fail the submission itself, since the response is already saved.
async function runFormActions(form: Form, answers: Record<string, unknown>, createdBy: string): Promise<void> {
  const { actions } = form;
  if (actions.notifyUserId) {
    await createNotification(
      actions.notifyUserId,
      `New response — ${form.title}`,
      "A new form response just came in.",
      "/forms",
      "system"
    ).catch(() => {});
  }
  if (actions.createLead) {
    const draft = buildLeadDraftFromAnswers(answers, actions.leadMapping);
    await createLead({
      ...draft,
      createdBy,
      alternatePhone: null,
      destination: "Not specified",
      tripType: null, travelDate: null, returnDate: null, duration: null, pax: null, budget: null,
      stage: "new", priority: "warm", source: `Form: ${form.title}`,
      assignedTo: null, agentName: null,
      officeId: form.officeId, officeName: form.officeName,
      lastContactedAt: null,
    }, createdBy).catch(() => {});
  }
}

// Internal-form submission only — filled by an already-authenticated staff
// member inside the dashboard, so this goes through the normal client SDK
// like everything else in the app. Public forms submit via the token-gated
// /api/public/forms/{token} route instead (no Firestore write access for an
// anonymous visitor).
export async function submitFormResponse(form: Form, data: FormResponseFormData, createdBy: string): Promise<FormResponse> {
  const response = await formResponseRepository.create({
    ...data,
    createdBy,
    status: "active",
  });
  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.FORMS, data.formId), { responseCount: increment(1) });
  await runFormActions(form, data.answers, createdBy);
  return response;
}
