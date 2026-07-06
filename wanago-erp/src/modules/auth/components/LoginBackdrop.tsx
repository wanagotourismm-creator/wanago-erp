"use client";

import { motion } from "framer-motion";
import { Plane, TreePalm, Compass, Mountain, Sunset, Sailboat } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

type FloatingIcon = {
  Icon: typeof Plane;
  top: string;
  left?: string;
  right?: string;
  size: number;
  duration: number;
  delay: number;
  hideOnMobile?: boolean;
};

const FLOATING_ICONS: FloatingIcon[] = [
  { Icon: Plane,    top: "13%", left: "9%",   size: 30, duration: 9,   delay: 0    },
  { Icon: TreePalm, top: "76%", left: "7%",   size: 36, duration: 11,  delay: 1.2  },
  { Icon: Compass,  top: "22%", right: "11%", size: 26, duration: 8,   delay: 0.6, hideOnMobile: true },
  { Icon: Mountain, top: "64%", right: "8%",  size: 32, duration: 10,  delay: 0.3  },
  { Icon: Sunset,   top: "9%",  right: "24%", size: 24, duration: 12,  delay: 0.9, hideOnMobile: true },
  { Icon: Sailboat, top: "83%", right: "26%", size: 28, duration: 9.5, delay: 1.5, hideOnMobile: true },
];

// Slow ambient background for the login screen only — animated gradient,
// a couple of drifting mountain-silhouette layers, and floating travel
// icons. Everything animates via transform/opacity (or background-position,
// which is paint-only) so it stays smooth without touching layout.
export function LoginBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="travel-gradient-bg relative min-h-screen w-full overflow-hidden">

      {/* Soft rising-sun glow */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[18%] h-72 w-72 -translate-x-1/2 rounded-full blur-3xl sm:h-96 sm:w-96"
        style={{ background: "radial-gradient(circle, rgba(224,144,79,0.35) 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating travel icons */}
      {FLOATING_ICONS.map(({ Icon, top, left, right, size, duration, delay, hideOnMobile }, i) => (
        <motion.div
          key={i}
          className={cn("pointer-events-none absolute text-white/25", hideOnMobile && "hidden sm:block")}
          style={{ top, left, right }}
          animate={{ y: [0, -16, 0], rotate: [0, 4, -3, 0] }}
          transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
        >
          <Icon size={size} strokeWidth={1.5} />
        </motion.div>
      ))}

      {/* Mountain silhouette layers — wider than viewport, drift slightly so edges never show */}
      <motion.div
        className="pointer-events-none absolute bottom-0 left-[-10%] h-36 w-[120%] sm:h-52"
        style={{
          background: "#134a32",
          opacity: 0.45,
          clipPath: "polygon(0% 100%, 0% 58%, 8% 65%, 18% 42%, 28% 60%, 38% 36%, 50% 62%, 62% 32%, 74% 56%, 86% 40%, 100% 62%, 100% 100%)",
        }}
        animate={{ x: [-16, 0, -16] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-0 left-[-10%] h-24 w-[120%] sm:h-36"
        style={{
          background: "#0a2518",
          opacity: 0.6,
          clipPath: "polygon(0% 100%, 0% 72%, 12% 80%, 24% 56%, 36% 74%, 48% 52%, 60% 76%, 72% 50%, 84% 72%, 100% 54%, 100% 100%)",
        }}
        animate={{ x: [10, -10, 10] }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Vignette for text/card contrast */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/25" />

      {/* Foreground content */}
      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  );
}
