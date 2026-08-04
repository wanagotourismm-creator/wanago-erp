import { cn } from "@/lib/utils/helpers";

type Props = {
  destination: string;
  title:       string;
  meta:        string;
  amount?:     string;
  badge?:      React.ReactNode;
  onClick?:    () => void;
  bandIndex?:  number; // cycles through BANDS for visual variety in a scroll row
};

// Gradient stand-ins for destination photography — no image pipeline exists
// for bookings yet, so this reads as "designed" rather than a broken <img>.
const BANDS = [
  "from-emerald-600 to-emerald-900",
  "from-orange-500 to-red-700",
  "from-blue-500 to-indigo-900",
  "from-teal-500 to-cyan-800",
];

export function CoverCard({ destination, title, meta, amount, badge, onClick, bandIndex = 0 }: Props) {
  const band = BANDS[bandIndex % BANDS.length];
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-[168px] flex-shrink-0 overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-transform active:scale-[0.98]"
    >
      <div className={cn("flex h-[76px] items-end bg-gradient-to-br p-2.5", band)}>
        <span className="text-[13px] font-extrabold text-white">{destination}</span>
      </div>
      <div className="p-2.5">
        <p className="truncate text-[12.5px] font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">{meta}</p>
        {(amount || badge) && (
          <div className="mt-1.5 flex items-center justify-between gap-1">
            {amount && <span className="text-xs font-extrabold text-primary">{amount}</span>}
            {badge}
          </div>
        )}
      </div>
    </button>
  );
}

// Horizontal scroller wrapper — negative margin bleeds to the screen edge
// on mobile while the parent page keeps its normal padding.
export function CoverCardRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {children}
    </div>
  );
}
