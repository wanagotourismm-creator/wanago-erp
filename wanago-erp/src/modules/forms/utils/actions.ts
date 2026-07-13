import type { FormActions, FormLeadMapping } from "@/modules/forms/types";

export const DEFAULT_FORM_ACTIONS: FormActions = {
  notifyUserId: null,
  notifyUserName: null,
  createLead: false,
  leadMapping: { nameFieldId: null, emailFieldId: null, phoneFieldId: null, notesFieldId: null },
};

function answerToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export type LeadDraftFromForm = {
  name:  string;
  email: string | null;
  phone: string;
  notes: string | null;
};

// Pulls the mapped answers into the shape createLead() needs — used
// identically by the internal (client SDK) and public (Admin SDK) submit
// paths, since the mapping logic itself doesn't touch Firestore.
export function buildLeadDraftFromAnswers(
  answers: Record<string, unknown>,
  mapping: FormLeadMapping
): LeadDraftFromForm {
  const get = (fieldId: string | null) => fieldId ? answerToText(answers[fieldId]).trim() : "";
  return {
    name:  get(mapping.nameFieldId) || "Form submission",
    email: get(mapping.emailFieldId) || null,
    phone: get(mapping.phoneFieldId),
    notes: get(mapping.notesFieldId) || null,
  };
}
