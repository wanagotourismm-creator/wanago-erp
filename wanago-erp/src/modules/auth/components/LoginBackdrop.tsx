"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Fraunces } from "next/font/google";
import { motion } from "framer-motion";
import { Plane, TreePalm, Compass, Mountain, Sunset, Sailboat } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import { usePublicBranding } from "@/modules/admin/settings/hooks/usePublicBranding";

// Warm display serif, scoped to the login screen only.
const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"], style: ["italic"], display: "swap" });

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
  { Icon: TreePalm, top: "70%", left: "7%",   size: 34, duration: 11,  delay: 1.2  },
  { Icon: Compass,  top: "22%", right: "11%", size: 26, duration: 8,   delay: 0.6, hideOnMobile: true },
  { Icon: Mountain, top: "58%", right: "9%",  size: 30, duration: 10,  delay: 0.3, hideOnMobile: true },
  { Icon: Sunset,   top: "9%",  right: "24%", size: 24, duration: 12,  delay: 0.9, hideOnMobile: true },
  { Icon: Sailboat, top: "76%", right: "20%", size: 28, duration: 9.5, delay: 1.5 },
];

// Same tick pattern as the Dashboard's greeting banner clock, kept local to
// avoid an auth -> dashboard module dependency for a few lines of logic.
function useClock() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
      setDate(now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return { time, date };
}

export function LoginBackdrop({ children }: { children: React.ReactNode }) {
  const { time, date } = useClock();
  const company = usePublicBranding();

  return (
    <div className="travel-gradient-bg relative min-h-screen w-full overflow-hidden">

      {/* Soft rising-sun glow */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[14%] h-72 w-72 -translate-x-1/2 rounded-full blur-3xl sm:h-96 sm:w-96"
        style={{ background: "radial-gradient(circle, rgba(224,144,79,0.35) 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Far mountain range */}
      <motion.div
        className="pointer-events-none absolute bottom-[22%] left-[-10%] h-32 w-[120%] sm:h-44"
        style={{
          background: "#134a32",
          opacity: 0.5,
          clipPath: "polygon(0% 100%, 0% 55%, 8% 64%, 18% 34%, 28% 58%, 38% 28%, 50% 60%, 62% 24%, 74% 54%, 86% 36%, 100% 60%, 100% 100%)",
        }}
        animate={{ x: [-16, 0, -16] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Waterfall — thin flowing streak down the far mountain's valley */}
      <motion.div
        className="pointer-events-none absolute bottom-[22%] left-[34%] w-[5px] overflow-hidden rounded-full sm:w-[7px]"
        style={{ height: "16%", background: "rgba(255,255,255,0.25)" }}
      >
        <motion.div
          className="h-[300%] w-full"
          style={{
            background: "repeating-linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.2) 12%, rgba(255,255,255,0.85) 24%)",
          }}
          animate={{ y: ["0%", "33%"] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>

      {/* Near hill / cliff line */}
      <motion.div
        className="pointer-events-none absolute bottom-[14%] left-[-10%] h-20 w-[120%] sm:h-28"
        style={{
          background: "#0a2518",
          opacity: 0.6,
          clipPath: "polygon(0% 100%, 0% 72%, 12% 80%, 24% 56%, 36% 74%, 48% 52%, 60% 76%, 72% 50%, 84% 72%, 100% 54%, 100% 100%)",
        }}
        animate={{ x: [10, -10, 10] }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Sea — gentle shimmering band along the base */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-[14%] w-full"
        style={{ background: "linear-gradient(180deg, rgba(20,90,110,0.55) 0%, rgba(10,50,60,0.75) 100%)" }}
      >
        <motion.div
          className="h-full w-[200%]"
          style={{ background: "repeating-linear-gradient(100deg, rgba(255,255,255,0.09) 0%, transparent 6%, transparent 12%)" }}
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Road — recedes toward the mountains, in front of the sea/hills */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-[20%] w-full"
        style={{
          background: "#5c4c3f",
          opacity: 0.7,
          clipPath: "polygon(41% 100%, 59% 100%, 52% 45%, 48% 45%)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 h-[20%] w-[3px] -translate-x-1/2"
        style={{
          background: "repeating-linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.55) 10%, transparent 10%, transparent 20%)",
          clipPath: "polygon(46% 100%, 54% 100%, 50% 45%, 50% 45%)",
        }}
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

      {/* Vignette for text/card contrast */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/25" />

      {/* Logo — top-left */}
      <motion.div
        className="absolute left-5 top-5 z-20 h-16 w-64 sm:left-8 sm:top-7 sm:h-24 sm:w-96 lg:h-28 lg:w-[27rem]"
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <Image
          src="/images/logo-white-clean.png"
          alt={company.businessName}
          fill
          className="object-contain object-left"
          priority
          sizes="432px"
        />
      </motion.div>

      {/* Live clock + date — top-right */}
      <motion.div
        className="absolute right-5 top-5 z-20 text-right sm:right-8 sm:top-7"
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
      >
        <p className="font-mono text-lg font-bold tracking-tight text-white/90 tabular-nums sm:text-2xl">{time}</p>
        <p className="text-[11px] text-white/60 sm:text-xs">{date}</p>
      </motion.div>

      {/* Foreground content — centered on mobile; on larger screens a left
          showcase panel balances the sign-in card on the right */}
      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center gap-10 px-4 py-24 lg:flex-row lg:items-center lg:justify-between lg:px-14 lg:py-0 xl:px-24">

        {/* Left showcase — desktop only, fills the space beside the card */}
        <motion.div
          className="hidden max-w-md lg:block"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
            Since 2022 · Wayanad, Kerala
          </p>
          <p
            className={cn(fraunces.className, "mt-5 text-4xl italic leading-tight text-white xl:text-5xl")}
            style={{ textShadow: "0 2px 16px rgba(0,0,0,0.3)" }}
          >
            Every journey
            <br />
            begins with
            <br />
            a dream.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            {["100+ Packages", "5 Founders", "Pan-India Trips"].map((stat) => (
              <span
                key={stat}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/85 backdrop-blur-sm"
              >
                {stat}
              </span>
            ))}
          </div>
        </motion.div>

        {children}
      </div>
    </div>
  );
}
