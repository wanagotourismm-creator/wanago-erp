"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  fetchChannels, createChannel, findOrCreateConversation, fetchMyConversations,
  fetchRecentMessages, subscribeToMessages, sendMessage, uploadChatAttachment,
} from "@/modules/teamspace/services/teamspace.service";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { useAuthStore } from "@/store/auth.store";
import { useTeamSpaceUIStore } from "@/store/teamspace-ui.store";
import { subscribeToPresence, type PresenceMap } from "@/lib/presence";
import type { Channel, Conversation, Message, TeamMember } from "@/modules/teamspace/types";
import type { ChannelSchema } from "@/modules/teamspace/schemas";

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
  const unsubRef = useRef<(() => void) | null>(null);

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

  const membersWithPresence = useMemo(
    () => members.map((m) => ({ ...m, online: presence[m.id]?.online ?? false })),
    [members, presence]
  );

  // Subscribe to messages of the active conversation
  useEffect(() => {
    unsubRef.current?.();
    unsubRef.current = null;
    if (!active) { setMessages([]); return; }

    setLoading(true);
    fetchRecentMessages(active.id).then((msgs) => {
      setMessages(msgs);
      setLoading(false);
    }).catch(() => setLoading(false));

    unsubRef.current = subscribeToMessages(active.id, setMessages);
    return () => { unsubRef.current?.(); };
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function openChannel(channel: Channel) {
    setActive({ type: "channel", id: channel.id, label: `#${channel.name}` });
  }

  async function openDM(member: TeamMember) {
    if (!user) return;
    const conv = await findOrCreateConversation(user.uid, member.id, officeId);
    setConversations((p) => (p.some((c) => c.id === conv.id) ? p : [...p, conv]));
    setActive({ type: "dm", id: conv.id, label: member.name });
  }

  async function send(text: string) {
    if (!user || !active || !text.trim()) return;
    await sendMessage(active.id, active.type, text.trim(), user.uid, user.displayName ?? "User", officeId, {
      parentMessageId: replyTo?.id ?? null,
    });
    setReplyTo(null);
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

  async function addChannel(data: ChannelSchema) {
    if (!user) return { error: "Not signed in" };
    try {
      const ch = await createChannel(data, user.uid);
      setChannels((p) => [...p, ch].sort((a, b) => a.name.localeCompare(b.name)));
      return { error: null };
    } catch { return { error: "Failed to create channel" }; }
  }

  function memberName(uid: string) {
    return members.find((m) => m.id === uid)?.name ?? "Unknown";
  }

  return {
    open, openPanel, closePanel, togglePanel,
    channels, conversations, members: membersWithPresence,
    active, openChannel, openDM,
    messages, loading, send, sendAttachment, addChannel, memberName,
    replyTo, startReply, cancelReply,
    sidebarError, retry: loadSidebar,
  };
}
