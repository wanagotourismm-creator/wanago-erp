"use client";

import { Fraunces } from "next/font/google";
import { AnimatePresence, motion } from "framer-motion";
import { X, Compass } from "lucide-react";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["600", "700"], style: ["normal", "italic"], display: "swap" });

type Props = {
  open:    boolean;
  onClose: () => void;
};

export function AboutUsModal({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl shadow-2xl"
            style={{ background: "rgba(255,255,255,0.97)" }}
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-7 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: "#228050" }}>
                  <Compass size={19} className="text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Introducing</p>
                  <h2 className={`${fraunces.className} text-xl font-semibold text-gray-900`}>Wanago</h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={17} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-7 py-6 space-y-4">
              <p className="text-[15px] leading-relaxed text-gray-700">
                Every journey begins with a dream — ours began in Wayanad, our hometown and one of Kerala&apos;s most
                captivating travel destinations. What started in 2022 as a small idea shared among five childhood
                friends has grown into a trusted travel company known for its professionalism, passion, and personal
                touch. With the encouragement of our families and community, we opened our first office in Kalpetta,
                the heart of Wayanad, and have since completed over 100+ memorable unique packages, building
                relationships that continue to define us.
              </p>
              <p className="text-[15px] leading-relaxed text-gray-700">
                Our story is one of resilience and growth. Wayanad&apos;s spirit — its beauty and strength — taught us
                that every challenge is an opportunity to evolve. Through changing seasons and uncertain times, we
                remained committed to our dream. Each experience shaped our journey, helping us expand our services
                across South and North India&apos;s most loved destinations, while preparing to launch international
                tours that bring the world closer to our travelers.
              </p>
              <p className="text-[15px] leading-relaxed text-gray-700">
                At our core, we believe travel is more than movement — it&apos;s an emotion. It&apos;s about
                connecting with people, stories, and cultures. Guided by trust, transparency, and care, we craft
                journeys that blend local authenticity with professional excellence. With us, every trip is not just
                a vacation — it&apos;s an experience to remember.
              </p>

              <div className="!mt-6 rounded-2xl px-5 py-4" style={{ background: "rgba(34,128,80,0.07)" }}>
                <p className={`${fraunces.className} text-center text-lg italic`} style={{ color: "#228050" }}>
                  &ldquo;We know, you wanna go.&rdquo;
                </p>
                <p className="mt-2 text-center text-xs font-medium text-gray-500">
                  To provide seamless, trustable, and memorable travel experiences.
                </p>
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
