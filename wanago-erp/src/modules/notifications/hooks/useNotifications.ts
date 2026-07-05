"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { subscribeToNotifications, markNotificationRead, markAllNotificationsRead } from "@/modules/notifications/services/notification.service";
import { playNotificationSound } from "@/lib/notification-sound";
import type { AppNotification } from "@/modules/notifications/types";

export function useNotifications() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const seenIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!user) return;
    seenIds.current = null;
    const unsub = subscribeToNotifications(user.uid, (items) => {
      if (seenIds.current === null) {
        // First snapshot on load — just record what's already there, no sound.
        seenIds.current = new Set(items.map((n) => n.id));
      } else {
        const hasNew = items.some((n) => !seenIds.current!.has(n.id));
        if (hasNew) playNotificationSound();
        seenIds.current = new Set(items.map((n) => n.id));
      }
      setNotifications(items);
    });
    return unsub;
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markRead(id: string) {
    await markNotificationRead(id);
    setNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  async function markAllRead() {
    await markAllNotificationsRead(notifications);
    setNotifications((p) => p.map((n) => ({ ...n, read: true })));
  }

  return { notifications, unreadCount, markRead, markAllRead };
}
