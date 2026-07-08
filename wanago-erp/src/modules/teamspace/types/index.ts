import type { FirestoreRecord } from "@/types/global";

export type ChannelType = "public" | "announcement";

export type Channel = FirestoreRecord & {
  name:        string;
  description: string | null;
  type:        ChannelType;
  officeId:    string;
  // null = visible to everyone in the office; a value = only members of
  // that department (enforced both client-side and in Firestore rules).
  department:  string | null;
  // Stamped on every sendMessage() — lets the sidebar show unread
  // indicators without subscribing to every channel's full message list.
  lastMessageAt?:       FirestoreRecord["createdAt"] | null;
  lastMessageSenderId?: string | null;
};

export type Conversation = FirestoreRecord & {
  memberIds: string[]; // exactly 2 uids for a DM
  officeId:  string;
  lastMessageAt?:       FirestoreRecord["createdAt"] | null;
  lastMessageSenderId?: string | null;
};

export type MessageTargetType = "channel" | "dm";

export type AttachmentType = "image" | "video" | "audio" | "file";

export type MessageAttachment = {
  url:  string;
  type: AttachmentType;
  name: string;
};

// emoji -> uids who reacted with it
export type MessageReactions = Record<string, string[]>;

export type Message = FirestoreRecord & {
  convId:          string;
  convType:        MessageTargetType;
  senderId:        string;
  senderName:      string;
  text:            string;
  readBy:          string[];
  officeId:        string;
  attachment:      MessageAttachment | null;
  parentMessageId: string | null;
  reactions:       MessageReactions;
};

export type TeamMember = {
  id:      string;
  name:    string;
  dept:    string;
  role:    string;
  online?: boolean;
  unread?: boolean;
};
