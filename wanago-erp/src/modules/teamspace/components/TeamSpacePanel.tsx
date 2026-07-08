"use client";

import { useEffect, useRef, useState } from "react";
import {
  MessageSquare, X, Hash, Megaphone, Plus, Send, Loader2, AlertTriangle, RefreshCw,
  ChevronLeft, Paperclip, Mic, Square, CornerUpLeft, FileText, Download,
} from "lucide-react";
import { useTeamSpace } from "@/modules/teamspace/hooks/useTeamSpace";
import { ChannelForm } from "@/modules/teamspace/components/ChannelForm";
import { useAuthStore } from "@/store/auth.store";
import { cn, initials, timeAgo } from "@/lib/utils/helpers";
import type { Channel, TeamMember } from "@/modules/teamspace/types";

function formatSeconds(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TeamSpacePanel() {
  const { user } = useAuthStore();
  const {
    open, openPanel, closePanel,
    channels, members,
    active, openChannel, openDM,
    messages, loading, send, sendAttachment, addChannel,
    replyTo, startReply, cancelReply,
    sidebarError, retry,
  } = useTeamSpace();

  const [draft, setDraft] = useState("");
  const [channelFormOpen, setChannelFormOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [attachError, setAttachError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // Stop any in-progress recording/mic stream if the panel closes mid-recording.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (!user) return null;

  const activeChannel: Channel | undefined = active?.type === "channel"
    ? channels.find((c) => c.id === active.id)
    : undefined;

  const isAnnouncementChannel = activeChannel?.type === "announcement";
  const canPostAnnouncement = user.systemRole === "super_admin" || user.systemRole === "admin" || user.systemRole === "hr";
  const canPost = !isAnnouncementChannel || canPostAnnouncement;

  function selectChannel(c: Channel) { openChannel(c); setMobileView("chat"); }
  function selectDM(m: TeamMember) { openDM(m); setMobileView("chat"); }

  async function handleSend() {
    if (!draft.trim() || !canPost) return;
    const text = draft;
    setDraft("");
    await send(text);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAttachError(null);
    const { error } = await sendAttachment(file);
    if (error) setAttachError(error);
  }

  async function startRecording() {
    setAttachError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (chunksRef.current.length === 0) return; // discarded
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-message-${Date.now()}.webm`, { type: "audio/webm" });
        const { error } = await sendAttachment(file);
        if (error) setAttachError(error);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      setAttachError("Couldn't access your microphone.");
    }
  }

  function stopRecording(discard = false) {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRecording(false);
    if (discard) chunksRef.current = [];
    mediaRecorderRef.current?.stop();
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={openPanel}
        aria-label="Open Team Space"
        className={cn(
          "fixed bottom-20 right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full lg:hidden",
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

            {/* Sidebar — full-screen list on mobile, fixed rail on desktop.
                On mobile this and the message pane are mutually exclusive
                (mobileView) instead of squeezing both into the same screen. */}
            <div className={cn(
              "w-full sm:w-[220px] flex-shrink-0 flex-col border-b sm:border-b-0 sm:border-r border-border bg-muted/30 overflow-y-auto scrollbar-thin",
              mobileView === "chat" ? "hidden sm:flex" : "flex"
            )}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                <p className="text-sm font-semibold text-foreground">Team Space</p>
                <button onClick={closePanel} className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted sm:hidden">
                  <X size={14} />
                </button>
              </div>

              {sidebarError && (
                <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
                  <AlertTriangle size={12} className="flex-shrink-0" />
                  <span className="flex-1">{sidebarError}</span>
                  <button onClick={() => retry()} title="Retry" className="flex-shrink-0 hover:text-destructive/70">
                    <RefreshCw size={12} />
                  </button>
                </div>
              )}

              <div className="flex-1 py-2">
                <div className="flex items-center justify-between px-3 pt-2 pb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Channels</p>
                  <button onClick={() => setChannelFormOpen(true)} title="New channel" className="text-muted-foreground hover:text-foreground">
                    <Plus size={12} />
                  </button>
                </div>
                {channels.map((c) => (
                  <button key={c.id} onClick={() => selectChannel(c)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                      active?.id === c.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}>
                    {c.type === "announcement" ? <Megaphone size={12} className="flex-shrink-0" /> : <Hash size={12} className="flex-shrink-0" />}
                    <span className="truncate">{c.name}</span>
                    {c.department && <span className="ml-auto flex-shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-semibold uppercase text-muted-foreground">{c.department}</span>}
                  </button>
                ))}

                <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Direct Messages</p>
                {members.length === 0 && (
                  <p className="px-3 py-1 text-[11px] italic text-muted-foreground/60">No teammates linked yet</p>
                )}
                {members.map((m) => (
                  <button key={m.id} onClick={() => selectDM(m)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                      active?.type === "dm" && active.label === m.name ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}>
                    <span className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
                      {initials(m.name)}
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-card",
                          m.online ? "bg-green-500" : "bg-muted-foreground/40"
                        )}
                        title={m.online ? "Online" : "Offline"}
                      />
                    </span>
                    <span className="truncate">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main */}
            <div className={cn("flex-1 flex-col min-h-0", mobileView === "list" ? "hidden sm:flex" : "flex")}>
              <div className="flex items-center justify-between border-b border-border px-3 sm:px-4 py-3 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <button onClick={() => setMobileView("list")} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted sm:hidden">
                    <ChevronLeft size={16} />
                  </button>
                  <p className="text-sm font-semibold text-foreground truncate">{active?.label ?? "Select a conversation"}</p>
                </div>
                <button onClick={closePanel} className="hidden sm:flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
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
                  const parent = m.parentMessageId ? messages.find((x) => x.id === m.parentMessageId) : undefined;
                  return (
                    <div key={m.id} className={cn("flex items-end gap-1.5", mine ? "justify-end" : "justify-start")}>
                      {!mine && (
                        <button onClick={() => startReply(m)} title="Reply" className="mb-1 flex-shrink-0 text-muted-foreground/50 hover:text-primary">
                          <CornerUpLeft size={12} />
                        </button>
                      )}
                      <div className={cn("max-w-[75%] rounded-2xl px-3 py-2", mine ? "bg-primary text-white" : "bg-muted text-foreground")}>
                        {!mine && <p className="text-[10px] font-semibold opacity-70 mb-0.5">{m.senderName}</p>}
                        {parent && (
                          <div className={cn("mb-1.5 rounded-lg border-l-2 px-2 py-1 text-[11px] opacity-80", mine ? "border-white/50 bg-white/10" : "border-primary/50 bg-background/60")}>
                            <p className="font-semibold">{parent.senderName}</p>
                            <p className="truncate">{parent.text || "Attachment"}</p>
                          </div>
                        )}
                        {m.attachment && (
                          <div className="mb-1.5">
                            {m.attachment.type === "image" && (
                              <a href={m.attachment.url} target="_blank" rel="noopener noreferrer">
                                <img src={m.attachment.url} alt={m.attachment.name} className="max-h-56 rounded-lg object-cover" />
                              </a>
                            )}
                            {m.attachment.type === "video" && (
                              <video src={m.attachment.url} controls className="max-h-56 rounded-lg" />
                            )}
                            {m.attachment.type === "audio" && (
                              <audio src={m.attachment.url} controls className="h-9 max-w-full" />
                            )}
                            {m.attachment.type === "file" && (
                              <a href={m.attachment.url} target="_blank" rel="noopener noreferrer"
                                className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs", mine ? "bg-white/10" : "bg-background/60")}>
                                <FileText size={14} className="flex-shrink-0" />
                                <span className="truncate flex-1">{m.attachment.name}</span>
                                <Download size={12} className="flex-shrink-0" />
                              </a>
                            )}
                          </div>
                        )}
                        {m.text && <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>}
                        <p className={cn("text-[9px] mt-1", mine ? "text-white/70" : "text-muted-foreground")}>{timeAgo(m.createdAt)}</p>
                      </div>
                      {mine && (
                        <button onClick={() => startReply(m)} title="Reply" className="mb-1 flex-shrink-0 text-muted-foreground/50 hover:text-primary">
                          <CornerUpLeft size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border p-3 flex-shrink-0">
                {!canPost ? (
                  <p className="text-center text-[11px] text-muted-foreground py-2">Only Admin/HR can post in #{activeChannel?.name}</p>
                ) : (
                  <>
                    {attachError && (
                      <div className="mb-2 flex items-center gap-2 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive">
                        <AlertTriangle size={11} className="flex-shrink-0" />
                        <span className="flex-1">{attachError}</span>
                        <button onClick={() => setAttachError(null)}><X size={11} /></button>
                      </div>
                    )}
                    {replyTo && (
                      <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-[11px]">
                        <CornerUpLeft size={11} className="flex-shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-foreground">{replyTo.senderName}: </span>
                          <span className="text-muted-foreground truncate">{replyTo.text || "Attachment"}</span>
                        </div>
                        <button onClick={cancelReply}><X size={12} /></button>
                      </div>
                    )}
                    {recording ? (
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-red-500" />
                        <span className="flex-1 text-sm text-muted-foreground">Recording… {formatSeconds(recordSeconds)}</span>
                        <button onClick={() => stopRecording(true)} title="Discard" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors">
                          <X size={15} />
                        </button>
                        <button onClick={() => stopRecording(false)} title="Send" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors">
                          <Square size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange}
                          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" />
                        <button onClick={() => fileInputRef.current?.click()} disabled={!active} title="Attach a file"
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors">
                          <Paperclip size={15} />
                        </button>
                        <input
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                          placeholder={active ? `Message ${active.label}…` : "Select a conversation…"}
                          disabled={!active}
                          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary transition-colors disabled:opacity-50"
                        />
                        {draft.trim() ? (
                          <button onClick={handleSend} disabled={!active || !draft.trim()}
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors">
                            <Send size={15} />
                          </button>
                        ) : (
                          <button onClick={startRecording} disabled={!active} title="Record a voice message"
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors">
                            <Mic size={15} />
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      <ChannelForm open={channelFormOpen} officeId={user.officeId}
        departments={Array.from(new Set(members.map((m) => m.dept).filter(Boolean)))}
        onClose={() => setChannelFormOpen(false)}
        onSubmit={async (data) => { await addChannel(data); setChannelFormOpen(false); }} />
    </>
  );
}
