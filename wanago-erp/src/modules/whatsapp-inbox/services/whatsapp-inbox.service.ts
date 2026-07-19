import { where } from "firebase/firestore";
import { auth } from "@/lib/firebase/client";
import {
  whatsappConversationRepository,
  whatsappMessageRepository,
} from "@/modules/whatsapp-inbox/services/whatsapp-inbox.repository";
import { toDate } from "@/lib/utils/helpers";
import type { WhatsAppConversation, WhatsAppMessage } from "@/modules/whatsapp-inbox/types";

function byLastMessageDesc(a: WhatsAppConversation, b: WhatsAppConversation): number {
  return (toDate(b.lastMessageAt)?.getTime() ?? 0) - (toDate(a.lastMessageAt)?.getTime() ?? 0);
}

function byCreatedAtAsc(a: WhatsAppMessage, b: WhatsAppMessage): number {
  return (toDate(a.createdAt)?.getTime() ?? 0) - (toDate(b.createdAt)?.getTime() ?? 0);
}

// Sorted client-side (not via Firestore orderBy) so this listener only
// needs the collection's default index, matching the convention used by
// teamspace/call-logs — no manual composite index deployment required.
export function subscribeToConversations(callback: (items: WhatsAppConversation[]) => void) {
  return whatsappConversationRepository.subscribe([], (items) => callback(items.sort(byLastMessageDesc)));
}

export function subscribeToMessages(conversationId: string, callback: (items: WhatsAppMessage[]) => void) {
  return whatsappMessageRepository.subscribe(
    [where("conversationId", "==", conversationId)],
    (items) => callback(items.sort(byCreatedAtAsc)),
  );
}

export async function markConversationRead(conversationId: string): Promise<void> {
  return whatsappConversationRepository.update(conversationId, { unreadCount: 0 } as Partial<WhatsAppConversation>);
}

// Claiming an unassigned conversation and reassigning an already-assigned
// one are the same write — firestore.rules is what actually tells them
// apart (canReassign() only gates touching assignedTo when it's already
// set; claiming a null one is open to anyone, same as Lead/Customer).
export async function assignConversation(
  conversationId: string, employeeId: string, employeeName: string
): Promise<void> {
  return whatsappConversationRepository.update(conversationId, {
    assignedTo: employeeId, agentName: employeeName,
  } as Partial<WhatsAppConversation>);
}

// The API route owns the Meta credentials and persists the outbound
// message itself — the inbox UI learns about the new message through its
// real-time subscription above, not this call's response.
export async function sendReply(conversationId: string, body: string): Promise<void> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error("Not signed in");
  const res = await fetch("/api/whatsapp/send", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ conversationId, body }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(json.error ?? "Failed to send message");
  }
}
