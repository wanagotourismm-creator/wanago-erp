"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  format?: (n: number) => string;
  durationMs?: number;
};

// Counts up from 0 to `value` once on mount/value-change — skips the
// animation entirely for users with prefers-reduced-motion set, jumping
// straight to the final number instead.
export function AnimatedCounter({ value, format, durationMs = 900 }: Props) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || value === 0) {
      setDisplay(value);
      return;
    }
    startRef.current = null;
    let frame: number;
    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      // ease-out cubic — fast start, gentle settle, reads as "counting up" not linear ticking
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return <>{format ? format(display) : display}</>;
}
