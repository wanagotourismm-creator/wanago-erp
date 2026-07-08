import {
  where, arrayUnion, getDocs, query, collection,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { toDate } from "@/lib/utils/helpers";
import type { Channel, Conversation, Message, MessageTargetType, MessageAttachment, AttachmentType } from "@/modules/teamspace/types";
import type { ChannelSchema } from "@/modules/teamspace/schemas";

function byCreatedAtAsc(a: Message, b: Message): number {
  return (toDate(a.createdAt)?.getTime() ?? 0) - (toDate(b.createdAt)?.getTime() ?? 0);
}

class ChannelRepository extends BaseRepository<Channel> {
  constructor() { super(FIRESTORE_COLLECTIONS.TEAMSPACE_CHANNELS); }
}
class ConversationRepository extends BaseRepository<Conversation> {
  constructor() { super(FIRESTORE_COLLECTIONS.TEAMSPACE_CONVERSATIONS); }
}
class MessageRepository extends BaseRepository<Message> {
  constructor() { super(FIRESTORE_COLLECTIONS.TEAMSPACE_MESSAGES); }
}

const channelRepo = new ChannelRepository();
const conversationRepo = new ConversationRepository();
const messageRepo = new MessageRepository();

const DEFAULT_CHANNELS: { name: string; description: string; type: "public" | "announcement" }[] = [
  { name: "general",       description: "Company-wide updates", type: "public" },
  { name: "operations",    description: "Operations coordination", type: "public" },
  { name: "announcements", description: "Official announcements — posted by Admin/HR", type: "announcement" },
];

// ── Channels ─────────────────────────────────────────────────
// Note: sorted client-side (not via Firestore orderBy) so this query
// only needs a single-field index on officeId, which Firestore creates
// automatically — no manual composite index deployment required.
export async function fetchChannels(officeId: string): Promise<Channel[]> {
  const existing = await channelRepo.findMany({ constraints: [where("officeId", "==", officeId)] });
  if (existing.length > 0) return existing.sort((a, b) => a.name.localeCompare(b.name));

  // First-time setup for this office: seed the default channel set once.
  const created = await Promise.all(
    DEFAULT_CHANNELS.map((c) => channelRepo.create({
      ...c, officeId, department: null, status: "active", createdBy: "system",
    }))
  );
  return created.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createChannel(data: ChannelSchema, createdBy: string): Promise<Channel> {
  return channelRepo.create({
    name:        data.name.toLowerCase().replace(/\s+/g, "-"),
    description: data.description || null,
    type:        data.type,
    officeId:    data.officeId,
    department:  data.department || null,
    status:      "active",
    createdBy,
  });
}

// ── Conversations (DMs) ─────────────────────────────────────
export async function findOrCreateConversation(myId: string, otherId: string, officeId: string): Promise<Conversation> {
  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.TEAMSPACE_CONVERSATIONS),
    where("memberIds", "array-contains", myId),
  );
  const snap = await getDocs(q);
  const existing = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Conversation)
    .find((c) => c.memberIds.includes(otherId));
  if (existing) return existing;

  return conversationRepo.create({
    memberIds: [myId, otherId],
    officeId,
    status:    "active",
    createdBy: myId,
  });
}

export async function fetchMyConversations(myId: string): Promise<Conversation[]> {
  return conversationRepo.findMany({ constraints: [where("memberIds", "array-contains", myId)] });
}

// ── Messages ─────────────────────────────────────────────────
// Note: sorted client-side (not via Firestore orderBy) so these queries
// only need a single-field index on convId, which Firestore creates
// automatically — no manual composite index deployment required.
export async function fetchRecentMessages(convId: string, take = 50): Promise<Message[]> {
  const msgs = await messageRepo.findMany({ constraints: [where("convId", "==", convId)] });
  return msgs.sort(byCreatedAtAsc).slice(-take);
}

export function subscribeToMessages(convId: string, callback: (msgs: Message[]) => void) {
  return messageRepo.subscribe(
    [where("convId", "==", convId)],
    (msgs) => callback(msgs.sort(byCreatedAtAsc).slice(-200)),
  );
}

export async function sendMessage(
  convId: string, convType: MessageTargetType, text: string,
  senderId: string, senderName: string, officeId: string,
  opts?: { attachment?: MessageAttachment | null; parentMessageId?: string | null },
): Promise<Message> {
  return messageRepo.create({
    convId, convType, text, senderId, senderName, officeId,
    attachment:      opts?.attachment ?? null,
    parentMessageId: opts?.parentMessageId ?? null,
    readBy:    [senderId],
    status:    "active",
    createdBy: senderId,
  });
}

export async function markMessageRead(messageId: string, userId: string): Promise<void> {
  return messageRepo.update(messageId, { readBy: arrayUnion(userId) as unknown as string[] });
}

// Free-tier-friendly cap — Firebase Storage isn't unlimited, and a stray
// multi-hundred-MB video pasted into chat shouldn't eat into it unchecked.
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024; // 20MB

function attachmentTypeFor(mime: string): AttachmentType {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

export async function uploadChatAttachment(convId: string, file: File): Promise<MessageAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("That file is larger than 20MB — try a smaller one.");
  }
  const path = `teamspace/${convId}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { url, type: attachmentTypeFor(file.type), name: file.name };
}
