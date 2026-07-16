import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { WhatsAppTemplate, WhatsAppTemplateFormData } from "@/modules/admin/whatsapp-templates/types";

class WhatsAppTemplateRepository extends BaseRepository<WhatsAppTemplate> {
  constructor() { super(FIRESTORE_COLLECTIONS.WHATSAPP_TEMPLATES); }
}
const repo = new WhatsAppTemplateRepository();

export async function fetchWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  return repo.findMany();
}

export async function createWhatsAppTemplate(data: WhatsAppTemplateFormData, createdBy: string): Promise<WhatsAppTemplate> {
  return repo.create({ ...data, createdBy, status: "active" });
}

export async function updateWhatsAppTemplate(id: string, data: Partial<WhatsAppTemplateFormData>): Promise<void> {
  return repo.update(id, data);
}

export async function deleteWhatsAppTemplate(id: string): Promise<void> {
  return repo.delete(id);
}
