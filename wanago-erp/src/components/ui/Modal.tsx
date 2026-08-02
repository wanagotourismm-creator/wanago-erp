"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/helpers";
import { usePlatform } from "@/lib/utils/platform";

type ModalSize = "sm" | "md" | "lg" | "xl";

type Props = {
  onClose:      () => void;
  children:     React.ReactNode;
  size?:        ModalSize;
  dismissible?: boolean;
  className?:   string;
};

// Non-prefixed widths — used by the Android and desktop (centered) shells.
const WIDTHS: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

// sm:-prefixed widths — the iOS sheet is edge-to-edge below the sm breakpoint
// (phones) and only takes a bounded width once there's room to center it (tablets).
const IOS_WIDTHS: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

const DRAG_DISMISS_THRESHOLD = 90;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared modal shell with a platform-specific presentation:
 *  - iOS:     bottom sheet, grab handle, swipe-down to dismiss, spring easing.
 *  - Android: centered Material-style dialog, large corner radius, elevation shadow.
 *  - Desktop: today's centered card — plus keyboard focus trapping/restoration,
 *    the mouse-and-keyboard equivalent of the native gestures the other two got.
 * Callers keep their own header/body/footer markup — this only replaces the
 * outer overlay + card wrapper every *Modal.tsx / *Form.tsx used to hand-roll.
 */
export function Modal({ onClose, children, size = "md", dismissible = true, className }: Props) {
  const platform = usePlatform();
  const [dragY, setDragY] = useState(0);
  const drag = useRef({ startY: 0, active: false });
  const cardRef = useRef<HTMLDivElement>(null);

  // Focus moves into the modal on open and back to whatever triggered it on
  // close, and Tab/Shift+Tab cycle within the modal instead of escaping into
  // the page behind it — standard native-dialog behavior that keyboard/mouse
  // users on desktop expect, mirroring the swipe/Material conventions above.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const card = cardRef.current;
    const firstFocusable = card?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? card)?.focus({ preventScroll: true });
    return () => previouslyFocused?.focus?.({ preventScroll: true });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (dismissible) onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = cardRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, dismissible]);

  function handleDragStart(e: React.PointerEvent) {
    drag.current = { startY: e.clientY, active: true };
  }
  function handleDragMove(e: React.PointerEvent) {
    if (!drag.current.active) return;
    const delta = e.clientY - drag.current.startY;
    if (delta > 0) setDragY(delta);
  }
  function handleDragEnd() {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (dragY > DRAG_DISMISS_THRESHOLD) onClose();
    else setDragY(0);
  }

  if (platform === "ios") {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        {dismissible && <div className="absolute inset-0 bg-black/40" onClick={onClose} />}
        <div
          ref={cardRef}
          tabIndex={-1}
          className={cn(
            "sheet-enter relative flex w-full flex-col overflow-hidden outline-none",
            "rounded-t-[22px] border-t border-border sm:rounded-[22px] sm:border sm:border-primary/20",
            "bg-card shadow-2xl max-h-[92dvh]",
            IOS_WIDTHS[size],
            className
          )}
          style={{
            transform:     dragY ? `translateY(${dragY}px)` : undefined,
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <div
            className="flex flex-shrink-0 justify-center pt-2.5 pb-1 sm:hidden"
            style={{ touchAction: "none" }}
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
          >
            <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          {children}
        </div>
      </div>
    );
  }

  if (platform === "android") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {dismissible && <div className="absolute inset-0 bg-black/50" onClick={onClose} />}
        <div
          ref={cardRef}
          tabIndex={-1}
          className={cn(
            "dialog-enter relative flex w-full flex-col overflow-hidden rounded-[28px] bg-card outline-none",
            "shadow-[0_8px_10px_-6px_rgba(0,0,0,0.3),0_20px_38px_3px_rgba(0,0,0,0.28)]",
            "max-h-[88dvh]",
            WIDTHS[size],
            className
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {dismissible && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />}
      <div
        ref={cardRef}
        tabIndex={-1}
        className={cn(
          "modal-enter relative flex w-full flex-col overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-2xl outline-none",
          "max-h-[90dvh]",
          WIDTHS[size],
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
