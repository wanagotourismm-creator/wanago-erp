import { cn } from "@/lib/utils/helpers";

type Props = {
  value:      number;  // 0-100
  size?:      number;  // px, default 58
  label:      string;  // e.g. "3/5"
  caption?:   string;  // e.g. "DONE"
  className?: string;
};

// Conic-gradient donut used as a compact "day at a glance" indicator (e.g.
// tasks done, clock-in status) — cheaper than an SVG stroke-dasharray ring
// and just as crisp at these sizes.
export function ProgressRing({ value, size = 58, label, caption, className }: Props) {
  const pct = Math.max(0, Math.min(100, value));
  const inner = size - 12;

  return (
    <div
      className={cn("flex flex-shrink-0 items-center justify-center rounded-full", className)}
      style={{
        width:      size,
        height:     size,
        background: `conic-gradient(hsl(var(--primary)) 0% ${pct}%, hsl(var(--border)) ${pct}% 100%)`,
      }}
    >
      <div
        className="flex flex-col items-center justify-center rounded-full bg-card"
        style={{ width: inner, height: inner }}
      >
        <span className="text-[13px] font-extrabold leading-none text-foreground">{label}</span>
        {caption && <span className="mt-0.5 text-[8px] font-bold leading-none text-muted-foreground">{caption}</span>}
      </div>
    </div>
  );
}
