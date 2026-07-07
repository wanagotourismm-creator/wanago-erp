"use client";

import { useRef, useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

type Props = {
  onRefresh: () => Promise<void> | void;
  children:  React.ReactNode;
  className?: string;
};

const THRESHOLD = 70;
const MAX_PULL  = 100;

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    if (/(auto|scroll)/.test(window.getComputedStyle(node).overflowY)) return node;
    node = node.parentElement;
  }
  return null;
}

// Mobile pull-to-refresh, only engages when the page's real scroll
// container (found by walking up to the nearest overflow-y:auto ancestor —
// AppShell's <main>, not this component's own div) is already at the top.
// Deliberately built on raw touch events rather than framer-motion's drag:
// a generic drag wrapper around scrollable content would hijack every
// vertical touch gesture and break normal list scrolling.
export function PullToRefresh({ onRefresh, children, className }: Props) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const scrollParentRef = useRef<HTMLElement | null>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    scrollParentRef.current = findScrollParent(anchorRef.current);
  }, []);

  function handleTouchStart(e: React.TouchEvent) {
    if (refreshing) return;
    const scrollTop = scrollParentRef.current?.scrollTop ?? 0;
    if (scrollTop > 0) { startY.current = null; return; }
    startY.current = e.touches[0].clientY;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startY.current == null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) { setPull(0); return; }
    setPull(Math.min(delta * 0.5, MAX_PULL));
  }

  async function handleTouchEnd() {
    if (startY.current == null) return;
    startY.current = null;
    if (pull >= THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  }

  return (
    <div
      ref={anchorRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn("relative sm:contents", className)}
    >
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200 sm:hidden"
        style={{ height: pull }}
      >
        <RefreshCw
          size={18}
          className={cn("text-primary", refreshing && "animate-spin")}
          style={!refreshing ? { transform: `rotate(${(pull / MAX_PULL) * 360}deg)` } : undefined}
        />
      </div>
      {children}
    </div>
  );
}
