"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, Hash, Megaphone, Plus, Send, Loader2 } from "lucide-react";
import { useTeamSpace } from "@/modules/teamspace/hooks/useTeamSpace";
import { ChannelForm } from "@/modules/teamspace/components/ChannelForm";
import { useAuthStore } from "@/store/auth.store";
import { cn, initials, timeAgo } from "@/lib/utils/helpers";
import type { Channel } from "@/modules/teamspace/types";

export function TeamSpacePanel() {
  const { user } = useAuthStore();
  const {
    open, openPanel, closePanel,
    channels, members,
    active, openChannel, openDM,
    messages, loading, send, addChannel,
  } = useTeamSpace();

  const [draft, setDraft] = useState("");
  const [channelFormOpen, setChannelFormOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  if (!user) return null;

  const activeChannel: Channel | undefined = active?.type === "channel"
    ? channels.find((c) => c.id === active.id)
    : undefined;

  const isAnnouncementChannel = activeChannel?.type === "announcement";
  const canPostAnnouncement = user.systemRole === "super_admin" || user.systemRole === "admin" || user.systemRole === "hr";
  const canPost = !isAnnouncementChannel || canPostAnnouncement;

  async function handleSend() {
    if (!draft.trim() || !canPost) return;
    const text = draft;
    setDraft("");
    await send(text);
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={openPanel}
        aria-label="Open Team Space"
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-13 w-13 items-center justify-center rounded-full",
          "bg-primary text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all",
          "h-[52px] w-[52px]",
          open && "hidden"
        )}
      >
        <MessageSquare size={22} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/40 sm:hidden" onClick={closePanel} />
          <div className="modal-enter relative flex h-full w-full sm:h-[600px] sm:w-[820px] sm:max-h-[85vh] flex-col sm:flex-row overflow-hidden rounded-none sm:rounded-2xl border border-border bg-card shadow-2xl">

            {/* Sidebar */}
            <div className="flex w-full sm:w-[220px] flex-shrink-0 flex-col border-b sm:border-b-0 sm:border-r border-border bg-muted/30 max-h-[40vh] sm:max-h-none overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                <p className="text-sm font-semibold text-foreground">Team Space</p>
                <button onClick={closePanel} className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted sm:hidden">
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 py-2">
                <div className="flex items-center justify-between px-3 pt-2 pb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Channels</p>
                  <button onClick={() => setChannelFormOpen(true)} title="New channel" className="text-muted-foreground hover:text-foreground">
                    <Plus size={12} />
                  </button>
                </div>
                {channels.map((c) => (
                  <button key={c.id} onClick={() => openChannel(c)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                      active?.id === c.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}>
                    {c.type === "announcement" ? <Megaphone size={12} className="flex-shrink-0" /> : <Hash size={12} className="flex-shrink-0" />}
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}

                <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Direct Messages</p>
                {members.length === 0 && (
                  <p className="px-3 py-1 text-[11px] italic text-muted-foreground/60">No teammates linked yet</p>
                )}
                {members.map((m) => (
                  <button key={m.id} onClick={() => openDM(m)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                      active?.type === "dm" && active.label === m.name ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}>
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">{initials(m.name)}</span>
                    <span className="truncate">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main */}
            <div className="flex flex-1 flex-col min-h-0">
              <div className="hidden sm:flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0">
                <p className="text-sm font-semibold text-foreground">{active?.label ?? "Select a conversation"}</p>
                <button onClick={closePanel} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X size={15} />
                </button>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                {loading && (
                  <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 size={16} className="animate-spin" /></div>
                )}
                {!loading && messages.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-8">No messages yet — say hello 👋</p>
                )}
                {!loading && messages.map((m) => {
                  const mine = m.senderId === user.uid;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[75%] rounded-2xl px-3 py-2", mine ? "bg-primary text-white" : "bg-muted text-foreground")}>
                        {!mine && <p className="text-[10px] font-semibold opacity-70 mb-0.5">{m.senderName}</p>}
                        <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
                        <p className={cn("text-[9px] mt-1", mine ? "text-white/70" : "text-muted-foreground")}>{timeAgo(m.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border p-3 flex-shrink-0">
                {!canPost ? (
                  <p className="text-center text-[11px] text-muted-foreground py-2">Only Admin/HR can post in #{activeChannel?.name}</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                      placeholder={active ? `Message ${active.label}…` : "Select a conversation…"}
                      disabled={!active}
                      className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary transition-colors disabled:opacity-50"
                    />
                    <button onClick={handleSend} disabled={!active || !draft.trim()}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors">
                      <Send size={15} />
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      <ChannelForm open={channelFormOpen} officeId={user.officeId} onClose={() => setChannelFormOpen(false)}
        onSubmit={async (data) => { await addChannel(data); setChannelFormOpen(false); }} />
    </>
  );
}
