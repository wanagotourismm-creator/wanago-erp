import type { FirestoreRecord } from "@/types/global";

export type WhatsAppMessageDirection = "inbound" | "outbound";
export type WhatsAppDeliveryStatus = "sent" | "delivered" | "read" | "failed" | "received";

export type WhatsAppConversation = FirestoreRecord & {
  phoneNumber: string; // E.164, e.g. "+919876543210"

  // Linked by phone-number match against the customers collection when the
  // conversation is first created (inbound webhook) — null means no match
  // was found (e.g. a fresh lead texting before a Customer record exists).
  customerId:   string | null;
  customerName: string | null;

  lastMessagePreview:   string | null;
  lastMessageAt:        FirestoreRecord["createdAt"] | null;
  lastMessageDirection: WhatsAppMessageDirection | null;
  unreadCount: number;
};

export type WhatsAppMessage = FirestoreRecord & {
  conversationId: string;
  direction: WhatsAppMessageDirection;
  body: string;
  waMessageId:    string | null;
  deliveryStatus: WhatsAppDeliveryStatus;

  // Only set for outbound (staff-sent) messages.
  sentBy:     string | null;
  sentByName: string | null;
};
