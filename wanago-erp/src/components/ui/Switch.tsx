"use client";

import { cn } from "@/lib/utils/helpers";

type Props = {
  checked:    boolean;
  onChange:   (checked: boolean) => void;
  label?:     string;
  disabled?:  boolean;
  className?: string;
};

// Reusable on/off toggle — this codebase otherwise only has raw
// `<input type="checkbox">` scattered inline, but the Incentive Settings
// form needs seven independent toggles, so a single accessible component
// is worth having.
export function Switch({ checked, onChange, label, disabled, className }: Props) {
  return (
    <label className={cn(
      "inline-flex items-center gap-2 select-none",
      disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      className
    )}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted",
          disabled && "pointer-events-none"
        )}
      >
        <span className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-1"
        )} />
      </button>
      {label && <span className="text-sm font-medium text-foreground">{label}</span>}
    </label>
  );
}
