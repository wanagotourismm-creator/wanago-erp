import { createNotification } from "@/modules/notifications/services/notification.service";
import type { NotificationCategory } from "@/modules/notifications/types";

// Fires the in-app notification (source of truth) plus best-effort email/
// WhatsApp side channels. Email/WhatsApp failures never block the caller —
// they're delivery extras, not the primary record of the event.
export async function notifyUser(params: {
  userId?:   string | null;
  email?:    string | null;
  phone?:    string | null;
  title:     string;
  body:      string;
  link?:     string;
  category:  NotificationCategory;
}): Promise<void> {
  const tasks: Promise<unknown>[] = [];

  if (params.userId) {
    tasks.push(createNotification(params.userId, params.title, params.body, params.link ?? null, params.category));
  }
  if (params.email) {
    tasks.push(
      fetch("/api/notify/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: params.email, subject: params.title, body: params.body, link: params.link }),
      }).catch(() => {})
    );
  }
  if (params.phone) {
    tasks.push(
      fetch("/api/notify/whatsapp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: params.phone, body: `${params.title}\n${params.body}` }),
      }).catch(() => {})
    );
  }

  await Promise.allSettled(tasks);
}
