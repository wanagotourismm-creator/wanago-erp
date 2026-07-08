"use client";

import { cn } from "@/lib/utils/helpers";

type Props = {
  total:      number;
  current:    number; // 0-indexed
  playing:    boolean; // whether the current segment should be actively filling
  durationMs: number;  // how long the current segment's fill animation should take
};

// A YouTube/Instagram-Stories-style segmented timeline at the top of the
// screen — one bar per step, filled for steps already passed, and the
// current segment fills in real time while narration plays, which is the
// single biggest visual cue that this is "playing" like a video rather
// than a static tooltip.
export function TrainingProgressBar({ total, current, playing, durationMs }: Props) {
  return (
    <div className="fixed inset-x-0 top-0 z-[203] flex gap-1 p-2 sm:p-3">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
          {i < current && <div className="h-full w-full rounded-full bg-white" />}
          {i === current && (
            <div
              key={`${current}-${playing}`}
              className={cn("h-full w-full rounded-full bg-white", playing && "tour-fill")}
              style={playing ? { animationDuration: `${durationMs}ms` } : { transform: "scaleX(0)", transformOrigin: "left" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
