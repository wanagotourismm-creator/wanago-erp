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
};

export type Conversation = FirestoreRecord & {
  memberIds: string[]; // exactly 2 uids for a DM
  officeId:  string;
};

export type MessageTargetType = "channel" | "dm";

export type AttachmentType = "image" | "video" | "audio" | "file";

export type MessageAttachment = {
  url:  string;
  type: AttachmentType;
  name: string;
};

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
};

export type TeamMember = {
  id:      string;
  name:    string;
  dept:    string;
  role:    string;
  online?: boolean;
};
