"use client";

import { useEffect, useState } from "react";

export type Platform = "ios" | "android" | "desktop";

// iPadOS 13+ reports as "Macintosh" in the UA string, so a touch-capable
// "Mac" is the only reliable signal left to tell it apart from a real desktop.
export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  const isIOSUA    = /iPhone|iPad|iPod/i.test(ua);
  const isIPadOS13 = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  if (isIOSUA || isIPadOS13) return "ios";
  return "desktop";
}

// Starts as "desktop" during SSR/first paint, then resolves on mount —
// avoids hydration mismatches since navigator isn't available on the server.
export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>("desktop");
  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);
  return platform;
}
