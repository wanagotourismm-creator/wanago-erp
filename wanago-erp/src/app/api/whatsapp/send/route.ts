import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, requireAuth } from "@/lib/firebase/admin";
import { sendWhatsAppMessage } from "@/lib/whatsapp/meta-client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// Sends the reply through Meta (server-held credentials) and persists the
// outbound message in the same request, so a message can never appear sent
// without also being recorded — the inbox UI picks the new message up via
// its real-time Firestore subscription rather than this response body.
export async function POST(req: NextRequest) {
  const caller = await requireAuth(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server isn't configured for this yet" }, { status: 501 });

  let payload: { conversationId?: string; body?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const body = payload.body?.trim();
  if (!payload.conversationId || !body) {
    return NextResponse.json({ error: "Missing conversationId/body" }, { status: 400 });
  }

  const convoRef = db.collection(FIRESTORE_COLLECTIONS.WHATSAPP_CONVERSATIONS).doc(payload.conversationId);
  const convoSnap = await convoRef.get();
  if (!convoSnap.exists) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  const phoneNumber = convoSnap.data()?.phoneNumber as string | undefined;
  if (!phoneNumber) return NextResponse.json({ error: "Conversation has no phone number on file" }, { status: 400 });

  const userDoc = await db.collection("users").doc(caller.uid).get();
  const senderName = (userDoc.data()?.displayName as string | undefined) ?? "Staff";

  const result = await sendWhatsAppMessage(phoneNumber, body);
  if (!result.ok) {
    const status = result.error.startsWith("WhatsApp isn't set up") ? 501 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  const now = FieldValue.serverTimestamp();
  await db.collection(FIRESTORE_COLLECTIONS.WHATSAPP_MESSAGES).add({
    conversationId: payload.conversationId,
    direction:      "outbound",
    body,
    waMessageId:    result.messageId || null,
    deliveryStatus: "sent",
    sentBy:         caller.uid,
    sentByName:     senderName,
    createdAt: now,
    updatedAt: now,
    createdBy: caller.uid,
    status:    "active",
  });

  await convoRef.update({
    lastMessagePreview:   body.slice(0, 200),
    lastMessageAt:        now,
    lastMessageDirection: "outbound",
    updatedAt: now,
  });

  return NextResponse.json({ ok: true });
}
