import type { FirestoreRecord } from "@/types/global";

export type ChannelType = "public" | "announcement";

export type Channel = FirestoreRecord & {
  name:        string;
  description: string | null;
  type:        ChannelType;
  officeId:    string;
};

export type Conversation = FirestoreRecord & {
  memberIds: string[]; // exactly 2 uids for a DM
  officeId:  string;
};

export type MessageTargetType = "channel" | "dm";

export type Message = FirestoreRecord & {
  convId:      string;
  convType:    MessageTargetType;
  senderId:    string;
  senderName:  string;
  text:        string;
  readBy:      string[];
  officeId:    string;
};

export type TeamMember = {
  id:   string;
  name: string;
  dept: string;
  role: string;
};
