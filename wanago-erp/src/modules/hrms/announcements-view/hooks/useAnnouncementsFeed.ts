import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { fetchChannels, fetchRecentMessages } from "@/modules/teamspace/services/teamspace.service";
import { broadcastAnnouncement } from "@/modules/admin/announcements/services/announcement.service";
import type { Message } from "@/modules/teamspace/types";

export function useAnnouncementsFeed() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.officeId) {
      setMessages([]);
      setChannelId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const channels = await fetchChannels(user.officeId);
      const channel = channels.find((c) => c.type === "announcement") ?? null;
      setChannelId(channel?.id ?? null);
      if (!channel) {
        setMessages([]);
        return;
      }
      const msgs = await fetchRecentMessages(channel.id, 50);
      // fetchRecentMessages returns oldest → newest; show newest first.
      setMessages(msgs.slice().reverse());
    } finally {
      setLoading(false);
    }
  }, [user?.officeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function post(text: string): Promise<void> {
    if (!user?.officeId) return;
    await broadcastAnnouncement(text, [user.officeId], user.uid, user.displayName ?? "Admin");
    await load();
  }

  return { messages, loading, channelId, reload: load, post };
}
