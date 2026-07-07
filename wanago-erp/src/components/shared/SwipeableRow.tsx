"use client";

import { useState } from "react";
import { motion, useMotionValue, animate, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils/helpers";

export type SwipeAction = {
  key:        string;
  icon:       React.ReactNode;
  label:      string;
  onClick:    () => void;
  className?: string; // background color for this action's revealed button
};

type Props = {
  children:  React.ReactNode;
  actions:   SwipeAction[];
  onTap?:    () => void;
  className?: string;
};

const ACTION_WIDTH = 64;
const SPRING = { type: "spring", stiffness: 420, damping: 42 } as const;

// Mobile card row with swipe-left-to-reveal actions (Call/Edit/Delete etc.),
// built on framer-motion's drag (already a dependency, no new package
// needed). Desktop keeps the existing table — this is only ever mounted in
// the `sm:hidden` mobile card layout, so it doesn't need to worry about
// non-touch input.
export function SwipeableRow({ children, actions, onTap, className }: Props) {
  const x = useMotionValue(0);
  const [open, setOpen] = useState(false);
  const maxDrag = -(actions.length * ACTION_WIDTH);

  function close() {
    animate(x, 0, SPRING);
    setOpen(false);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    const shouldOpen = actions.length > 0 && (info.offset.x < -ACTION_WIDTH / 2 || info.velocity.x < -300);
    animate(x, shouldOpen ? maxDrag : 0, SPRING);
    setOpen(shouldOpen);
  }

  function handleTap() {
    if (open) { close(); return; }
    onTap?.();
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {actions.length > 0 && (
        <div className="absolute inset-y-0 right-0 flex" style={{ width: actions.length * ACTION_WIDTH }}>
          {actions.map((a) => (
            <button
              key={a.key}
              onClick={() => { a.onClick(); close(); }}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-white",
                a.className ?? "bg-muted-foreground"
              )}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      )}

      <motion.div
        drag={actions.length > 0 ? "x" : false}
        dragConstraints={{ left: maxDrag, right: 0 }}
        dragElastic={0.05}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
        className="relative bg-card"
      >
        {children}
      </motion.div>
    </div>
  );
}
