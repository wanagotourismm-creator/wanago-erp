import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { WhatsAppConversation, WhatsAppMessage } from "@/modules/whatsapp-inbox/types";

export class WhatsAppConversationRepository extends BaseRepository<WhatsAppConversation> {
  constructor() { super(FIRESTORE_COLLECTIONS.WHATSAPP_CONVERSATIONS); }
}

export class WhatsAppMessageRepository extends BaseRepository<WhatsAppMessage> {
  constructor() { super(FIRESTORE_COLLECTIONS.WHATSAPP_MESSAGES); }
}

export const whatsappConversationRepository = new WhatsAppConversationRepository();
export const whatsappMessageRepository = new WhatsAppMessageRepository();
