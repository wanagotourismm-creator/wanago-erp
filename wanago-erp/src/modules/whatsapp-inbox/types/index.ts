import type { FirestoreRecord } from "@/types/global";

export type WhatsAppMessageDirection = "inbound" | "outbound";
export type WhatsAppDeliveryStatus = "sent" | "delivered" | "read" | "failed" | "received";
export type WhatsAppSentiment = "positive" | "neutral" | "negative";
export type WhatsAppIntent = "new_inquiry" | "booking_question" | "payment" | "complaint" | "general";

export type WhatsAppConversation = FirestoreRecord & {
  phoneNumber: string; // E.164, e.g. "+919876543210"

  // Linked by phone-number match against the customers collection when the
  // conversation is first created (inbound webhook) — null means no match
  // was found (e.g. a fresh lead texting before a Customer record exists).
  customerId:   string | null;
  customerName: string | null;

  // The staff member this conversation "belongs to" — mirrors
  // Lead/Customer/Booking's assignedTo/agentName pattern exactly (an
  // Employee.id + denormalized name, null = unassigned/claimable by
  // anyone). Auto-set from the matched customer's own assignedTo when the
  // conversation is first created (see findOrCreateConversation in the
  // webhook route); otherwise claimed/reassigned manually from the inbox.
  assignedTo?: string | null;
  agentName?:  string | null;

  lastMessagePreview:   string | null;
  lastMessageAt:        FirestoreRecord["createdAt"] | null;
  lastMessageDirection: WhatsAppMessageDirection | null;
  unreadCount: number;

  // Unlike lastMessageAt (overwritten on both inbound and outbound sends),
  // this only ever moves forward on an inbound message — the one signal
  // that answers "is this conversation inside Meta's 24h free-text window
  // right now," used by src/lib/whatsapp/template-router.ts. null until
  // the first inbound message.
  lastInboundMessageAt: FirestoreRecord["createdAt"] | null;

  // Set by the webhook after each inbound message (see
  // whatsapp-classify.service.ts) — reflects the customer's latest message,
  // not the whole thread's history. null until the first inbound message
  // is classified.
  sentiment?: WhatsAppSentiment | null;
  intent?:    WhatsAppIntent | null;
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
