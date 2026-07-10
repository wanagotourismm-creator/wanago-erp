"use client";

import { useState, useRef, useCallback } from "react";
import { askAssistant, transcribeAudio, type AssistantTurn } from "@/modules/aiassistant/services/ai-assistant.service";
import type { AIChatMessage } from "@/modules/aiassistant/types";
import type { AILanguage } from "@/lib/ai/getAIAnswer";

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `msg-${Date.now()}-${idCounter}`;
}

export function useAIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<AILanguage>("en");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const openPanel  = useCallback(() => setOpen(true), []);
  const closePanel = useCallback(() => setOpen(false), []);

  const ask = useCallback(async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const history: AssistantTurn[] = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { id: nextId(), role: "user", content: trimmed }]);
    setLoading(true);

    try {
      const result = await askAssistant(trimmed, history, language);
      setMessages((prev) => [...prev, {
        id: nextId(), role: "assistant",
        content: result.answer, source: result.source, articles: result.articles,
      }]);
    } catch {
      // Previously unguarded — a permission-denied or network failure left
      // the user's message posted with the spinner clearing and no reply
      // and no error, ever. Post a visible assistant-side failure instead.
      setMessages((prev) => [...prev, {
        id: nextId(), role: "assistant",
        content: "Sorry, something went wrong answering that. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, language]);

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
    language, setLanguage,
    recording, transcribing, voiceError, startRecording, stopRecording,
  };
}
