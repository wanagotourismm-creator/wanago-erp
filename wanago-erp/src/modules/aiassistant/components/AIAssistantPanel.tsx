"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles, X, Send, Loader2, AlertTriangle, Mic, Square, Volume2, VolumeX, Check, CheckCircle2, XCircle,
} from "lucide-react";
import { useAIAssistant } from "@/modules/aiassistant/hooks/useAIAssistant";
import { cn } from "@/lib/utils/helpers";
import type { AIChatMessage } from "@/modules/aiassistant/types";
import type { AILanguage } from "@/lib/ai/getAIAnswer";

const SPEECH_LANG: Record<AILanguage, string> = { en: "en-US", ml: "ml-IN" };

function findVoice(lang: AILanguage): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const prefix = lang === "ml" ? "ml" : "en";
  return window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(prefix)) ?? null;
}

function ProposalCard({ message, onConfirm, onCancel }: {
  message: AIChatMessage;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const proposal = message.proposal!;
  const [confirming, setConfirming] = useState(false);

  async function handleConfirm() {
    setConfirming(true);
    await onConfirm();
    setConfirming(false);
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-xl border border-border bg-card px-3 py-2.5 space-y-2">
        <p className="text-sm text-foreground">{proposal.summary}</p>

        {proposal.status === "pending" && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {confirming ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Confirm
            </button>
            <button
              onClick={onCancel}
              disabled={confirming}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {proposal.status === "confirmed" && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={13} /> Created
          </div>
        )}

        {proposal.status === "cancelled" && (
          <p className="text-xs font-medium text-muted-foreground">Cancelled — nothing was created.</p>
        )}

        {proposal.status === "error" && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
            <XCircle size={13} /> {proposal.errorMessage ?? "Couldn't create this."}
          </div>
        )}
      </div>
    </div>
  );
}

function AssistantMessage({ message }: { message: AIChatMessage }) {
  if (!message.content) return null;
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-foreground">
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  );
}

export function AIAssistantPanel() {
  const {
    open, openPanel, closePanel, messages, loading, ask,
    confirmAction, cancelAction,
    language, setLanguage,
    recording, transcribing, voiceError, startRecording, stopRecording,
  } = useAIAssistant();

  const [draft, setDraft] = useState("");
  const [speakEnabled, setSpeakEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSpokenId = useRef<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, loading]);

  // Reads the latest assistant reply aloud when speak-aloud is on — silently
  // does nothing if the browser has no installed voice for the selected
  // language (better than mispronouncing Malayalam with a wrong voice).
  useEffect(() => {
    if (!speakEnabled) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || !last.content || last.id === lastSpokenId.current) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const voice = findVoice(language);
    if (!voice) return;

    lastSpokenId.current = last.id;
    const utterance = new SpeechSynthesisUtterance(last.content);
    utterance.voice = voice;
    utterance.lang = SPEECH_LANG[language];
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [messages, speakEnabled, language]);

  function handleSend() {
    if (!draft.trim() || loading) return;
    const question = draft;
    setDraft("");
    ask(question);
  }

  async function handleMic() {
    if (recording) {
      const text = await stopRecording();
      if (text) setDraft(text);
      return;
    }
    await startRecording();
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={openPanel}
        aria-label="Ask Wanago Assistant"
        className={cn(
          "fixed bottom-36 right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full",
          "bg-primary text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all",
          "h-[52px] w-[52px]",
          "lg:bottom-6 lg:right-6",
          open && "hidden"
        )}
      >
        <Sparkles size={22} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/40 sm:hidden" onClick={closePanel} />
          <div className="modal-enter relative flex h-full w-full sm:h-[600px] sm:w-[420px] sm:max-h-[85vh] flex-col overflow-hidden rounded-none sm:rounded-2xl border border-border bg-card shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Sparkles size={15} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">Wanago Assistant</p>
                  <p className="text-[11px] text-muted-foreground truncate">Ask about the ERP, HR, or your leads &amp; quotes</p>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Language toggle */}
                <div className="flex items-center rounded-lg border border-border bg-muted p-0.5">
                  {(["en", "ml"] as AILanguage[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={cn(
                        "rounded-md px-2 py-1 text-[11px] font-semibold transition-colors",
                        language === lang ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {lang === "en" ? "EN" : "ML"}
                    </button>
                  ))}
                </div>

                {/* Speak-aloud toggle */}
                <button
                  onClick={() => setSpeakEnabled((v) => !v)}
                  title={speakEnabled ? "Turn off spoken replies" : "Read replies aloud"}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                    speakEnabled ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {speakEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                </button>

                <button onClick={closePanel} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-center px-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                    <Sparkles size={20} className="text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Ask me anything about Wanago</p>
                  <p className="mt-1 text-xs text-muted-foreground">e.g. &ldquo;How do I apply for leave?&rdquo;, &ldquo;What&rsquo;s the status of lead LD-0012?&rdquo;, or &ldquo;Create a lead for John, Goa trip&rdquo; — type or use the mic, in English or Malayalam.</p>
                </div>
              )}

              {messages.map((m) => {
                if (m.role === "user") {
                  return (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-white">
                        <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                      </div>
                    </div>
                  );
                }
                if (m.proposal) {
                  return (
                    <ProposalCard
                      key={m.id}
                      message={m}
                      onConfirm={() => confirmAction(m.id)}
                      onCancel={() => cancelAction(m.id)}
                    />
                  );
                }
                return <AssistantMessage key={m.id} message={m} />;
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-xs">Thinking…</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border p-3 flex-shrink-0 space-y-2">
              {voiceError && (
                <p className="flex items-center gap-1.5 text-[11px] text-destructive">
                  <AlertTriangle size={11} className="flex-shrink-0" /> {voiceError}
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMic}
                  disabled={transcribing || loading}
                  title={recording ? "Stop recording" : "Ask by voice"}
                  className={cn(
                    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border transition-colors disabled:opacity-40",
                    recording
                      ? "border-destructive bg-destructive/10 text-destructive animate-pulse"
                      : "border-border text-muted-foreground hover:text-primary hover:border-primary/40"
                  )}
                >
                  {transcribing ? <Loader2 size={15} className="animate-spin" /> : recording ? <Square size={13} /> : <Mic size={15} />}
                </button>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                  placeholder={recording ? "Listening…" : "Ask a question…"}
                  disabled={loading || recording}
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !draft.trim()}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
