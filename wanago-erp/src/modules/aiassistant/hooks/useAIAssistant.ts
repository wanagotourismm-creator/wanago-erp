"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { askAssistant, confirmProposedAction, transcribeAudio, type AssistantTurn } from "@/modules/aiassistant/services/ai-assistant.service";
import { fetchRecentHistory, saveChatMessage, clearChatHistory } from "@/modules/aiassistant/services/ai-chat-history.service";
import type { AIChatMessage } from "@/modules/aiassistant/types";
import type { AILanguage } from "@/lib/ai/getAIAnswer";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/store/auth.store";

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `msg-${Date.now()}-${idCounter}`;
}

export function useAIAssistant() {
  const open = useUIStore((s) => s.aiAssistantOpen);
  const openPanel = useUIStore((s) => s.openAIAssistant);
  const closePanel = useUIStore((s) => s.closeAIAssistant);
  const user = useAuthStore((s) => s.user);

  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [language, setLanguage] = useState<AILanguage>("en");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Previously every panel open started from a blank transcript — this
  // seeds it with the signed-in user's own recent history (their own
  // messages only; aiChatHistory is scoped per-uid, see firestore.rules) so
  // the assistant "remembers" past conversations across sessions.
  useEffect(() => {
    if (!user?.uid || historyLoaded) return;
    fetchRecentHistory(user.uid)
      .then((stored) => setMessages(stored.map((m) => ({ id: m.id, role: m.role, content: m.content }))))
      .catch(() => {})
      .finally(() => setHistoryLoaded(true));
  }, [user?.uid, historyLoaded]);

  const clearHistory = useCallback(async () => {
    if (!user?.uid) return;
    await clearChatHistory(user.uid).catch(() => {});
    setMessages([]);
  }, [user?.uid]);

  const ask = useCallback(async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const history: AssistantTurn[] = messages
      .filter((m) => m.content)
      .map((m) => ({ role: m.role, content: m.content! }));
    setMessages((prev) => [...prev, { id: nextId(), role: "user", content: trimmed }]);
    setLoading(true);
    if (user?.uid) saveChatMessage(user.uid, "user", trimmed);

    try {
      const result = await askAssistant(trimmed, history, language);
      if (result.kind === "answer") {
        setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: result.text }]);
        if (user?.uid) saveChatMessage(user.uid, "assistant", result.text);
      } else if (result.kind === "proposal") {
        setMessages((prev) => [...prev, {
          id: nextId(), role: "assistant",
          proposal: { tool: result.tool, args: result.args, summary: result.summary, status: "pending" },
        }]);
        // Proposals aren't saved as history text — same as what's already
        // excluded from the `history` array sent to the backend above
        // (.filter(m => m.content)) — a proposal card isn't plain-text
        // conversation the AI should be re-fed as prior context.
      } else {
        setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: result.message }]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: nextId(), role: "assistant",
        content: "Sorry, something went wrong answering that. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, language, user?.uid]);

  const confirmAction = useCallback(async (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message?.proposal || message.proposal.status !== "pending") return;

    const { tool, args, summary } = message.proposal;
    const result = await confirmProposedAction(tool, args, summary);

    setMessages((prev) => prev.map((m) => {
      if (m.id !== messageId || !m.proposal) return m;
      return result.ok
        ? { ...m, proposal: { ...m.proposal, status: "confirmed", resultDocId: result.docId } }
        : { ...m, proposal: { ...m.proposal, status: "error", errorMessage: result.error } };
    }));
  }, [messages]);

  const cancelAction = useCallback((messageId: string) => {
    setMessages((prev) => prev.map((m) =>
      m.id === messageId && m.proposal ? { ...m, proposal: { ...m.proposal, status: "cancelled" } } : m
    ));
  }, []);

  // Returns the transcribed text on success (caller decides what to do with
  // it — e.g. drop it into the input box for the employee to review before
  // sending), or null if recording/transcription failed (voiceError is set
  // in that case).
  const startRecording = useCallback(async (): Promise<void> => {
    setVoiceError(null);

    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setVoiceError("Voice input needs a secure connection (https://) — this page isn't loaded over one.");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setVoiceError("This browser doesn't support voice input. Try current Chrome, Edge, or Safari.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setVoiceError("This browser doesn't support audio recording (MediaRecorder unavailable).");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setVoiceError("Microphone permission was denied — check the site's microphone setting in your browser.");
      } else if (name === "NotFoundError") {
        setVoiceError("No microphone was found on this device.");
      } else if (name === "NotReadableError") {
        setVoiceError("Your microphone is already in use by another app.");
      } else {
        setVoiceError(`Couldn't start the microphone${name ? ` (${name})` : ""}.`);
      }
    }
  }, []);

  const stopRecording = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder) { resolve(null); return; }

      recorder.onstop = async () => {
        recorder.stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setTranscribing(true);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const result = await transcribeAudio(blob, language);
        setTranscribing(false);

        if ("error" in result) {
          setVoiceError(result.error);
          resolve(null);
        } else {
          resolve(result.text);
        }
      };
      recorder.stop();
    });
  }, [language]);

  return {
    open, openPanel, closePanel, messages, loading, ask,
    confirmAction, cancelAction, clearHistory,
    language, setLanguage,
    recording, transcribing, voiceError, startRecording, stopRecording,
  };
}
