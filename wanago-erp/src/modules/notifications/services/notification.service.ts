import { where } from "firebase/firestore";
import type { Unsubscribe } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { toDate } from "@/lib/utils/helpers";
import type { AppNotification, NotificationCategory } from "@/modules/notifications/types";

class NotificationRepository extends BaseRepository<AppNotification> {
  constructor() { super(FIRESTORE_COLLECTIONS.NOTIFICATIONS); }
}
const repo = new NotificationRepository();

export async function createNotification(
  userId: string, title: string, body: string, link: string | null, category: NotificationCategory
): Promise<AppNotification> {
  return repo.create({ userId, title, body, link, read: false, category, createdBy: userId, status: "active" });
}

// Filters by userId only (no orderBy) to avoid needing a composite index —
// sorted client-side instead, consistent with the rest of this codebase.
export function subscribeToNotifications(userId: string, callback: (items: AppNotification[]) => void): Unsubscribe {
  return repo.subscribe([where("userId", "==", userId)], (items) => {
    const sorted = [...items].sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
    callback(sorted.slice(0, 30));
  });
}

export async function markNotificationRead(id: string): Promise<void> {
  return repo.update(id, { read: true });
}

export async function markAllNotificationsRead(notifications: AppNotification[]): Promise<void> {
  await Promise.all(notifications.filter((n) => !n.read).map((n) => repo.update(n.id, { read: true })));
}
