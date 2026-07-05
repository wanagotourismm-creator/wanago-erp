"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useNotifications } from "@/modules/notifications/hooks/useNotifications";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, timeAgo } from "@/lib/utils/helpers";
import type { AppNotification } from "@/modules/notifications/types";

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleClick(n: AppNotification) {
    if (!n.read) markRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white ring-2 ring-card">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-40 flex max-h-[70vh] w-80 flex-col rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0">
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {notifications.length === 0 ? (
                <EmptyState title="No notifications yet" description="You're all caught up" icon={<span className="text-xl">🔔</span>} className="py-10" />
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={cn("flex w-full items-start gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/50", !n.read && "bg-primary/5")}
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
          </div>
        </>
      )}
    </div>
  );
}
