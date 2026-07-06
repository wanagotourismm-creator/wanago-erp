"use client";

import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { useNotifications } from "@/modules/notifications/hooks/useNotifications";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, timeAgo } from "@/lib/utils/helpers";
import type { AppNotification } from "@/modules/notifications/types";

export function NotificationsFullList() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const router = useRouter();

  function handleClick(n: AppNotification) {
    if (!n.read) markRead(n.id);
    if (n.link) router.push(n.link);
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Notifications</p>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <CheckCheck size={12} /> Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState title="You're all caught up." icon={<span className="text-xl">🔔</span>} className="py-16" />
      ) : (
        <div className="divide-y divide-border">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={cn(
                "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50",
                !n.read && "bg-primary/5"
              )}
            >
              <span className={cn("mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm truncate", n.read ? "text-foreground" : "font-semibold text-foreground")}>{n.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">{timeAgo(n.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
