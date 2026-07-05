"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchChannels, createChannel, findOrCreateConversation, fetchMyConversations,
  fetchRecentMessages, subscribeToMessages, sendMessage,
} from "@/modules/teamspace/services/teamspace.service";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import { useAuthStore } from "@/store/auth.store";
import { useTeamSpaceUIStore } from "@/store/teamspace-ui.store";
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
  const unsubRef = useRef<(() => void) | null>(null);

  const officeId = user?.officeId ?? "main";

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
      setChannels(chResult.value);
      if (!active && chResult.value.length > 0) {
        setActive({ type: "channel", id: chResult.value[0].id, label: chResult.value[0].name });
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
    sidebarError, retry: loadSidebar,
  };
}
