"use client";

import { useState } from "react";
import { Share2, Copy, Check, Sparkles } from "lucide-react";

type Props = {
  headline: string;   // e.g. "I've sent Wanago 5 referrals — ₹2,500 earned!"
  subline: string;    // e.g. "Join Refer & Earn and start earning too."
  shareText: string;  // full message for WhatsApp/copy — usually headline + subline + link
};

// No image generation (no canvas/server rendering needed) — just a
// well-designed card plus a share/copy action, kept deliberately simple.
// The WhatsApp link has no recipient baked in (unlike the referral kit
// share, which targets a specific person) — this opens WhatsApp's own
// contact picker since "who to brag to" isn't something we know.
export function ShareStatsCard({ headline, subline, shareText }: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary via-primary to-primary/80 p-5 text-white shadow-lg">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/70">
        <Sparkles size={12} /> Wanago Refer &amp; Earn
      </div>
      <p className="mt-2 text-lg font-bold leading-snug">{headline}</p>
      <p className="mt-1 text-sm text-white/80">{subline}</p>
      <div className="mt-4 flex items-center gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-white/90 transition-colors"
        >
          <Share2 size={14} /> Share
        </a>
        <button
          onClick={handleCopy}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25 transition-colors"
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  );
}
