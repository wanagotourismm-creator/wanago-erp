import { formRepository } from "@/modules/forms/services/form.repository";
import { toDate } from "@/lib/utils/helpers";
import { nextRefNumber } from "@/lib/firebase/ref-counter";
import type { Form, FormFormData } from "@/modules/forms/types";

// Sorted client-side (not via Firestore orderBy) so filtered queries only
// need single-field indexes — same convention as every other list in this app.
export async function fetchForms(): Promise<Form[]> {
  const forms = await formRepository.findMany();
  return forms.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export async function fetchFormById(id: string): Promise<Form | null> {
  return formRepository.findById(id);
}

export async function createForm(data: FormFormData, createdBy: string): Promise<Form> {
  const refNumber = await nextRefNumber("FORM");

  return formRepository.create({
    ...data,
    refNumber,
    createdBy,
    status:        "active",
    description:   data.description || null,
    shareToken:    null,
    responseCount: 0,
  });
}

export async function updateForm(id: string, data: Partial<FormFormData>): Promise<void> {
  return formRepository.update(id, data as Partial<Form>);
}

export async function deleteForm(id: string): Promise<void> {
  return formRepository.delete(id);
}

// Publishing a Public form generates its share link the first time (kept
// stable across re-publishes, matching how Lead.bookingLinkToken is never
// regenerated once a link has already been sent out). Internal forms don't
// need a token at all — they're opened by id, inside the authenticated app.
export async function publishForm(form: Form): Promise<void> {
  const patch: Partial<Form> = { formStatus: "published" };
  if (form.visibility === "public" && !form.shareToken) {
    patch.shareToken = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  }
  return formRepository.update(form.id, patch);
}

export async function closeForm(id: string): Promise<void> {
  return formRepository.update(id, { formStatus: "closed" } as Partial<Form>);
}
