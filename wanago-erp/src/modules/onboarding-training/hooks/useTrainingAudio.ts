"use client";

import { useEffect, useRef, useState } from "react";
import type { TrainingStep } from "@/modules/onboarding-training/types";

export type AudioStatus = "loading" | "ready" | "unavailable" | "error";
// "cloud" = Google Cloud TTS clip (cached in Storage, best quality).
// "browser" = the device's own free built-in speech synthesis — used
// automatically whenever Cloud TTS isn't configured or fails, so
// narration works with zero setup and zero cost.
export type AudioBackend = "cloud" | "browser" | null;

// speechSynthesis.getVoices() very often returns an empty array on the
// first call — voices load asynchronously in the background and the
// 'voiceschanged' event fires once they're actually ready. Calling
// getVoices() synchronously (the original bug here) meant the Malayalam
// voice lookup almost always ran before the list had populated, so it
// silently found nothing every time even on devices that do have one.
let voicesReadyPromise: Promise<SpeechSynthesisVoice[]> | null = null;
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve([]);
  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return Promise.resolve(existing);
  if (voicesReadyPromise) return voicesReadyPromise;
  voicesReadyPromise = new Promise((resolve) => {
    const handleChange = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleChange);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", handleChange);
    // Some browsers never fire voiceschanged if there's truly nothing to
    // load — don't hang forever waiting for it.
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
  });
  return voicesReadyPromise;
}

function pickVoice(voices: SpeechSynthesisVoice[], langPrefix: string): SpeechSynthesisVoice | undefined {
  return voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
}

// Fetches (or triggers generation of) a step's cached voiceover clip and
// drives a hidden <audio> element for it, falling back to the browser's
// own free text-to-speech when Cloud TTS isn't configured. Never blocks or
// breaks the walkthrough — an "unavailable"/"error" status just means no
// narration plays, everything else (Next/Back/quiz) keeps working normally.
export function useTrainingAudio(step: TrainingStep | null, language: "en" | "ml") {
  const [status, setStatus] = useState<AudioStatus>("loading");
  const [backend, setBackend] = useState<AudioBackend>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Only meaningful when backend === "browser" — true once we've actually
  // confirmed the device has no matching voice for the selected language,
  // so the UI can say so instead of silently mispronouncing the text.
  const [deviceVoiceMissing, setDeviceVoiceMissing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const text = step ? (language === "en" ? step.explanationEn : step.explanationMl) : "";
  const canUseBrowserSpeech = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!step) { setStatus("unavailable"); setBackend(null); return; }
    const cached = language === "en" ? step.audioUrlEn : step.audioUrlMl;
    let cancelled = false;
    setPlaying(false);
    setEnded(false);

    if (cached) {
      setUrl(cached);
      setBackend("cloud");
      setStatus("ready");
      return;
    }

    setStatus("loading");
    setUrl(null);
    // fetch() has no default timeout — if Cloud TTS generation stalls
    // server-side (or the network hangs), this must still give up and
    // fall back to browser speech rather than leaving the play button
    // stuck on a spinner forever.
    const abortController = new AbortController();
    const abortTimer = setTimeout(() => abortController.abort(), 15000);
    fetch("/api/onboarding-training/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stepId: step.id, language }),
      signal: abortController.signal,
    })
      .then(async (res) => {
        clearTimeout(abortTimer);
        if (cancelled) return;
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.url) {
          setUrl(data.url);
          setBackend("cloud");
          setStatus("ready");
          return;
        }
        if (canUseBrowserSpeech && text.trim()) {
          setBackend("browser");
          setStatus("ready");
        } else {
          setBackend(null);
          setStatus(res.status === 501 ? "unavailable" : "error");
          setMessage(data.error ?? "Voiceover unavailable");
        }
      })
      .catch(() => {
        clearTimeout(abortTimer);
        if (cancelled) return;
        if (canUseBrowserSpeech && text.trim()) {
          setBackend("browser");
          setStatus("ready");
        } else {
          setStatus("error");
          setMessage("Voiceover unavailable");
        }
      });

    return () => { cancelled = true; clearTimeout(abortTimer); abortController.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, language]);

  // Cloud playback — auto-play as soon as the clip's ready; a best effort,
  // browsers that block autoplay just leave it paused, still playable via
  // the button.
  useEffect(() => {
    if (backend !== "cloud" || status !== "ready" || !url || !audioRef.current) return;
    const el = audioRef.current;
    el.src = url;
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [backend, status, url]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onEnded = () => { setPlaying(false); setEnded(true); };
    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, []);

  // Browser speech playback — waits for the voice list to actually be
  // populated before picking one (see loadVoices() above), then starts
  // automatically the same way the cloud clip does.
  useEffect(() => {
    if (backend !== "browser" || status !== "ready" || !text.trim() || !canUseBrowserSpeech) return;
    let cancelled = false;
    window.speechSynthesis.cancel();

    loadVoices().then((voices) => {
      if (cancelled) return;
      const langPrefix = language === "ml" ? "ml" : "en";
      const match = pickVoice(voices, langPrefix);
      setDeviceVoiceMissing(language === "ml" && !match);

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = language === "ml" ? "ml-IN" : "en-IN";
      if (match) utter.voice = match;
      utter.onend = () => { setPlaying(false); setEnded(true); };
      utter.onerror = () => setPlaying(false);
      utteranceRef.current = utter;
      window.speechSynthesis.speak(utter);
      setPlaying(true);
    });

    return () => { cancelled = true; window.speechSynthesis.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, status, step?.id, language]);

  function toggle() {
    if (backend === "cloud") {
      const el = audioRef.current;
      if (!el) return;
      if (playing) { el.pause(); setPlaying(false); }
      else { setEnded(false); el.play().then(() => setPlaying(true)).catch(() => {}); }
      return;
    }
    if (backend === "browser" && canUseBrowserSpeech) {
      if (playing) {
        window.speechSynthesis.pause();
        setPlaying(false);
      } else if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setPlaying(true);
      } else if (utteranceRef.current) {
        setEnded(false);
        window.speechSynthesis.speak(utteranceRef.current);
        setPlaying(true);
      }
    }
  }

  function replay() {
    if (backend === "cloud") {
      const el = audioRef.current;
      if (!el) return;
      el.currentTime = 0;
      setEnded(false);
      el.play().then(() => setPlaying(true)).catch(() => {});
      return;
    }
    if (backend === "browser" && canUseBrowserSpeech && text.trim()) {
      window.speechSynthesis.cancel();
      loadVoices().then((voices) => {
        const match = pickVoice(voices, language === "ml" ? "ml" : "en");
        setDeviceVoiceMissing(language === "ml" && !match);
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = language === "ml" ? "ml-IN" : "en-IN";
        if (match) utter.voice = match;
        utter.onend = () => setPlaying(false);
        utteranceRef.current = utter;
        setEnded(false);
        window.speechSynthesis.speak(utter);
        setPlaying(true);
      });
    }
  }

  return { audioRef, status, backend, playing, ended, message, deviceVoiceMissing, toggle, replay };
}
