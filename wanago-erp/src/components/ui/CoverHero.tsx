import { X } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

type Props = {
  title:       string;
  subtitle:    string;
  destination: string;
  detail?:     string; // e.g. package name
  onClose:     () => void;
  bandIndex?:  number;
};

const BANDS = [
  "from-emerald-600 to-emerald-900",
  "from-orange-500 to-red-700",
  "from-blue-500 to-indigo-900",
  "from-teal-500 to-cyan-800",
];

// Full-screen detail sheets' mobile-only header — the destination gets a
// moment before the data does, instead of a plain avatar-and-name row.
// Desktop keeps the compact row (see the surrounding *DetailModal), since
// this is a phone-specific flourish, not a request to change desktop.
export function CoverHero({ title, subtitle, destination, detail, onClose, bandIndex = 0 }: Props) {
  const band = BANDS[bandIndex % BANDS.length];
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white", band)}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold">{title}</p>
          <p className="truncate text-xs text-white/80">{subtitle}</p>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/15 text-white"
        >
          <X size={15} />
        </button>
      </div>
      <p className="mt-3.5 text-[13px] font-semibold text-white/95">
        📍 {destination}{detail ? ` · ${detail}` : ""}
      </p>
    </div>
  );
}
