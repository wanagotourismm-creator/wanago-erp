"use client";

import { useEffect, useState } from "react";

// The shell's single mobile/tablet-vs-desktop cutover — see AppShell.tsx.
// Keep this in sync with Tailwind's `lg` breakpoint (1024px) so JS-driven
// layout branches never disagree with the `lg:`-prefixed CSS around them.
const LG_BREAKPOINT_QUERY = "(min-width: 1024px)";

// Starts "desktop" during SSR/first paint (matchMedia isn't available on the
// server), then resolves on mount — same hydration-safe pattern as usePlatform().
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(LG_BREAKPOINT_QUERY);
    const update = () => setIsMobile(!mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isMobile;
}

// General-purpose escape hatch for one-off queries; prefer useIsMobile()
// for the standard shell cutover.
export function useBreakpoint(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);

  return matches;
}
