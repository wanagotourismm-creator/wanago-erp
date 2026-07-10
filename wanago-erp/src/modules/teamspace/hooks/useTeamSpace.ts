"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  fetchChannels, createChannel, deleteChannel, findOrCreateConversation, fetchMyConversations,
  fetchRecentMessages, subscribeToMessages, sendMessage, uploadChatAttachment, toggleReaction,
} from "@/modules/teamspace/services/teamspace.service";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { useAuthStore } from "@/store/auth.store";
import { useTeamSpaceUIStore } from "@/store/teamspace-ui.store";
import { subscribeToPresence, type PresenceMap } from "@/lib/presence";
import { playMessageSound } from "@/lib/notification-sound";
import { toDate } from "@/lib/utils/helpers";
import type { Channel, Conversation, Message, TeamMember } from "@/modules/teamspace/types";
import type { ChannelSchema } from "@/modules/teamspace/schemas";

const LAST_READ_KEY = "wanago-teamspace-last-read";

function loadLastRead(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(LAST_READ_KEY) ?? "{}"); } catch { return {}; }
}

export type ActiveConv = { type: "channel" | "dm"; id: string; label: string } | null;

export function useTeamSpace() {
  const { user } = useAuthStore();
  const { open, openPanel, closePanel, togglePanel } = useTeamSpaceUIStore();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [active, setActive] = useState<ActiveConv>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarError, setSidebarError] = useState<string | null>(null);
  const [presence, setPresence] = useState<PresenceMap>({});
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [lastReadAt, setLastReadAt] = useState<Record<string, number>>(() => loadLastRead());
  const unsubRef = useRef<(() => void) | null>(null);
  const seenMessageIdsRef = useRef<Set<string> | null>(null);

  // Device-local (not synced across your other devices) — good enough for
  // "have I looked at this conversation" without adding a Firestore write
  // on every single conversation open.
  function markConvRead(convId: string) {
    setLastReadAt((prev) => {
      const next = { ...prev, [convId]: Date.now() };
      try { localStorage.setItem(LAST_READ_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  function isConvUnread(lastMessageAt: unknown, lastMessageSenderId: string | null | undefined, convId: string): boolean {
    if (!lastMessageAt || !lastMessageSenderId || lastMessageSenderId === user?.uid) return false;
    const t = toDate(lastMessageAt as never)?.getTime() ?? 0;
    return t > (lastReadAt[convId] ?? 0);
  }

  const officeId = user?.officeId ?? "main";

  useEffect(() => {
    if (!open) return;
    return subscribeToPresence(setPresence);
  }, [open]);

  const loadSidebar = useCallback(async () => {
    if (!user) return;
    setSidebarError(null);

    // Each source loads independently — one failing (e.g. a transient
    // Firestore error) shouldn't blank out the whole panel.
    const [chResult, convsResult, empsResult] = await Promise.allSettled([
      fetchChannels(officeId),
      fetchMyConversations(user.uid),
      fetchEmployees(),
    ]);

    if (chResult.status === "fulfilled") {
      // Department-scoped channels (department != null) are only visible to
      // members of that department — Firestore rules enforce this for real,
      // this filter just keeps them out of the sidebar for everyone else.
      const visible = chResult.value.filter((c) => !c.department || c.department === user.department);
      setChannels(visible);
      if (!active && visible.length > 0) {
        setActive({ type: "channel", id: visible[0].id, label: visible[0].name });
      }
    }
    if (convsResult.status === "fulfilled") setConversations(convsResult.value);
    if (empsResult.status === "fulfilled") {
      setMembers(
        empsResult.value
          .filter((e) => e.userId && e.userId !== user.uid)
          .map((e) => ({ id: e.userId as string, name: e.fullName, dept: e.department, role: e.designation ?? "" }))
      );
    }

    const failures = [chResult, convsResult, empsResult].filter(r => r.status === "rejected");
    if (failures.length > 0) {
      setSidebarError("Some Team Space data couldn't load. Try refreshing.");
    }
  }, [user, officeId, active]);

  useEffect(() => { if (open) loadSidebar(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const convByMemberId = useMemo(() => {
    const map = new Map<string, Conversation>();
    if (!user) return map;
    for (const c of conversations) {
      const other = c.memberIds.find((id) => id !== user.uid);
      if (other) map.set(other, c);
    }
    return map;
  }, [conversations, user]);

  const membersWithPresence = useMemo(
    () => members.map((m) => {
      const conv = convByMemberId.get(m.id);
      const unread = conv ? isConvUnread(conv.lastMessageAt, conv.lastMessageSenderId, conv.id) : false;
      return { ...m, online: presence[m.id]?.online ?? false, unread };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, presence, convByMemberId, lastReadAt, user?.uid]
  );

  const channelsWithUnread = useMemo(
    () => channels.map((c) => ({ ...c, unread: isConvUnread(c.lastMessageAt, c.lastMessageSenderId, c.id) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [channels, lastReadAt, user?.uid]
  );

  // Subscribe to messages of the active conversation
  useEffect(() => {
    unsubRef.current?.();
    unsubRef.current = null;
    seenMessageIdsRef.current = null;
    if (!active) { setMessages([]); return; }

    setLoading(true);
    fetchRecentMessages(active.id).then((msgs) => {
      setMessages(msgs);
      seenMessageIdsRef.current = new Set(msgs.map((m) => m.id));
      setLoading(false);
    }).catch(() => setLoading(false));

    unsubRef.current = subscribeToMessages(active.id, (msgs) => {
      // A Slack-style "pop" for messages that land while you're already
      // looking at this conversation — not for the initial load, and not
      // for your own messages echoing back.
      if (seenMessageIdsRef.current) {
        const isNewFromOther = msgs.some((m) => !seenMessageIdsRef.current!.has(m.id) && m.senderId !== user?.uid);
        if (isNewFromOther) playMessageSound();
      }
      seenMessageIdsRef.current = new Set(msgs.map((m) => m.id));
      setMessages(msgs);
      markConvRead(active.id); // actively viewing it — don't let it show as unread in the sidebar
    });
    return () => { unsubRef.current?.(); };
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function openChannel(channel: Channel) {
    setActive({ type: "channel", id: channel.id, label: `#${channel.name}` });
    markConvRead(channel.id);
  }

  async function openDM(member: TeamMember) {
    if (!user) return;
    const conv = await findOrCreateConversation(user.uid, member.id, officeId);
    setConversations((p) => (p.some((c) => c.id === conv.id) ? p : [...p, conv]));
    setActive({ type: "dm", id: conv.id, label: member.name });
    markConvRead(conv.id);
  }

  async function send(text: string): Promise<{ error: string | null }> {
    if (!user || !active || !text.trim()) return { error: null };
    try {
      await sendMessage(active.id, active.type, text.trim(), user.uid, user.displayName ?? "User", officeId, {
        parentMessageId: replyTo?.id ?? null,
      });
      setReplyTo(null);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to send message" };
    }
  }

  async function sendAttachment(file: File) {
    if (!user || !active) return { error: "Select a conversation first" };
    try {
      const attachment = await uploadChatAttachment(active.id, file);
      await sendMessage(active.id, active.type, "", user.uid, user.displayName ?? "User", officeId, {
        attachment, parentMessageId: replyTo?.id ?? null,
      });
      setReplyTo(null);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to send attachment" };
    }
  }

  function startReply(message: Message) { setReplyTo(message); }
  function cancelReply() { setReplyTo(null); }

  async function toggleMessageReaction(messageId: string, emoji: string) {
    if (!user) return;
    const msg = messages.find((m) => m.id === messageId);
    const alreadyReacted = !!msg?.reactions?.[emoji]?.includes(user.uid);
    try {
      await toggleReaction(messageId, emoji, user.uid, !alreadyReacted);
    } catch { /* best-effort */ }
  }

  async function addChannel(data: ChannelSchema) {
    if (!user) return { error: "Not signed in" };
    try {
      const ch = await createChannel(data, user.uid);
      setChannels((p) => [...p, ch].sort((a, b) => a.name.localeCompare(b.name)));
      return { error: null };
    } catch { return { error: "Failed to create channel" }; }
  }

  async function removeChannel(channelId: string) {
    try {
      await deleteChannel(channelId);
      setChannels((p) => p.filter((c) => c.id !== channelId));
      setActive((p) => (p?.type === "channel" && p.id === channelId ? null : p));
      return { error: null };
    } catch { return { error: "Failed to delete channel" }; }
  }

  function memberName(uid: string) {
    return members.find((m) => m.id === uid)?.name ?? "Unknown";
  }

  return {
    open, openPanel, closePanel, togglePanel,
    channels: channelsWithUnread, conversations, members: membersWithPresence,
    active, openChannel, openDM,
    messages, loading, send, sendAttachment, addChannel, removeChannel, memberName,
    replyTo, startReply, cancelReply, toggleMessageReaction,
    sidebarError, retry: loadSidebar,
  };
}
