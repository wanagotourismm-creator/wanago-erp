"use client";

import { useEffect, useRef, useState } from "react";
import type { TrainingStep } from "@/modules/onboarding-training/types";

export type AudioStatus = "loading" | "ready" | "unavailable" | "error";

// Fetches (or triggers generation of) a step's cached voiceover clip and
// drives a hidden <audio> element for it. Never blocks or breaks the
// walkthrough — an "unavailable"/"error" status just means no narration
// plays, everything else (Next/Back/quiz) keeps working normally.
export function useTrainingAudio(step: TrainingStep | null, language: "en" | "ml") {
  const [status, setStatus] = useState<AudioStatus>("loading");
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!step) { setStatus("unavailable"); return; }
    const cached = language === "en" ? step.audioUrlEn : step.audioUrlMl;
    let cancelled = false;
    setPlaying(false);

    if (cached) {
      setUrl(cached);
      setStatus("ready");
      return;
    }

    setStatus("loading");
    setUrl(null);
    fetch("/api/onboarding-training/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stepId: step.id, language }),
    })
      .then(async (res) => {
        if (cancelled) return;
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus(res.status === 501 ? "unavailable" : "error");
          setMessage(data.error ?? "Voiceover unavailable");
          return;
        }
        setUrl(data.url);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) { setStatus("error"); setMessage("Voiceover unavailable"); }
      });

    return () => { cancelled = true; };
  }, [step?.id, language]);

  // Auto-play as soon as the clip's ready for this step — a best effort;
  // browsers that block autoplay just leave it paused, still playable
  // via the button.
  useEffect(() => {
    if (status !== "ready" || !url || !audioRef.current) return;
    const el = audioRef.current;
    el.src = url;
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [status, url]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onEnded = () => setPlaying(false);
    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, []);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  function replay() {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.play().then(() => setPlaying(true)).catch(() => {});
  }

  return { audioRef, status, playing, message, toggle, replay };
}
