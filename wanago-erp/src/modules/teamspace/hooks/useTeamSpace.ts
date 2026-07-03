"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchChannels, createChannel, findOrCreateConversation, fetchMyConversations,
  fetchRecentMessages, subscribeToMessages, sendMessage,
} from "@/modules/teamspace/services/teamspace.service";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { useAuthStore } from "@/store/auth.store";
import type { Channel, Conversation, Message, TeamMember } from "@/modules/teamspace/types";
import type { ChannelSchema } from "@/modules/teamspace/schemas";

export type ActiveConv = { type: "channel" | "dm"; id: string; label: string } | null;

export function useTeamSpace() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [active, setActive] = useState<ActiveConv>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  const officeId = user?.officeId ?? "main";

  const loadSidebar = useCallback(async () => {
    if (!user) return;
    const [ch, convs, emps] = await Promise.all([
      fetchChannels(officeId),
      fetchMyConversations(user.uid),
      fetchEmployees(),
    ]);
    setChannels(ch);
    setConversations(convs);
    setMembers(
      emps
        .filter((e) => e.userId && e.userId !== user.uid)
        .map((e) => ({ id: e.userId as string, name: e.fullName, dept: e.department, role: e.designation }))
    );
    if (!active && ch.length > 0) {
      setActive({ type: "channel", id: ch[0].id, label: ch[0].name });
    }
  }, [user, officeId, active]);

  useEffect(() => { if (open) loadSidebar(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const openPanel  = useCallback(() => setOpen(true), []);
  const closePanel = useCallback(() => setOpen(false), []);
  const togglePanel = useCallback(() => setOpen((o) => !o), []);

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
    await sendMessage(active.id, active.type, text.trim(), user.uid, user.displayName ?? "User", officeId);
  }

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
    channels, conversations, members,
    active, openChannel, openDM,
    messages, loading, send, addChannel, memberName,
  };
}
