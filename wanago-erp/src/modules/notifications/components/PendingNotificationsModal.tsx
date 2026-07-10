"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, X, Palmtree, Clock, Laptop, Ticket, PartyPopper, FileCheck2, MapPin } from "lucide-react";
import { useNotifications } from "@/modules/notifications/hooks/useNotifications";
import { cn, timeAgo } from "@/lib/utils/helpers";
import type { AppNotification, NotificationCategory } from "@/modules/notifications/types";

const CATEGORY_ICON: Record<NotificationCategory, React.ElementType> = {
  leave: Palmtree, regularization: Clock, asset: Laptop, ticket: Ticket,
  system: PartyPopper, followup: Bell, approval: FileCheck2, location: MapPin,
};

// Shown once per browser session — the small bell badge is easy to miss
// entirely, so anything still unread when the app is first opened gets a
// prominent, hard-to-miss summary instead. Dismissing it (or navigating
// into an item) is remembered in sessionStorage so it doesn't re-pop on
// every page navigation within the same session — every route has its own
// AppShell instance and this component remounts on each cross-section nav,
// so plain component state alone would re-show it constantly.
const DISMISS_KEY = "wanago-pending-notifications-dismissed";

export function PendingNotificationsModal() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY) === "1"
  );
  const router = useRouter();

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  const shouldShow = unreadCount > 0 && !dismissed;
  if (!shouldShow) return null;

  const unread = notifications.filter((n) => !n.read);

  function handleOpen(n: AppNotification) {
    markRead(n.id);
    dismiss();
    if (n.link) router.push(n.link);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => dismiss()} />
      <div className="modal-enter relative w-full max-w-lg rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between bg-gradient-to-r from-primary to-green-700 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Bell size={18} className="text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-white">
                {unread.length === 1 ? "You have 1 update waiting" : `You have ${unread.length} updates waiting`}
              </p>
              <p className="text-xs text-white/80">Don&apos;t miss these while you&apos;re here</p>
            </div>
          </div>
          <button onClick={() => dismiss()} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto scrollbar-thin divide-y divide-border">
          {unread.map((n) => {
            const Icon = CATEGORY_ICON[n.category] ?? Bell;
            return (
              <button
                key={n.id}
                onClick={() => handleOpen(n)}
                className="flex w-full items-start gap-3 px-6 py-4 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/30 px-6 py-3">
          <button
            onClick={() => dismiss()}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={() => { markAllRead(); dismiss(); }}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            )}
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        </div>
      </div>
    </div>
  );
}
