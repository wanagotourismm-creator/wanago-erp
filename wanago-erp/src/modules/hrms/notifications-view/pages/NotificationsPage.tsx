"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { NotificationsFullList } from "@/modules/notifications/components/NotificationsFullList";

export function NotificationsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Notifications" />
      <NotificationsFullList />
    </div>
  );
}
