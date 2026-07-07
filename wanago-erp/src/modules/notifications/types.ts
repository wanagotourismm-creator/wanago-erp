import type { FirestoreRecord } from "@/types/global";

export type NotificationCategory = "leave" | "regularization" | "asset" | "ticket" | "system" | "followup" | "approval";

export type AppNotification = FirestoreRecord & {
  recipientId: string;
  title:       string;
  body:        string;
  link:        string | null;
  read:        boolean;
  category:    NotificationCategory;
};
