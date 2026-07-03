"use client";

import { useThemeStore, THEMES } from "@/store/theme.store";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

export function ThemePicker() {
  const { colorTheme, setColorTheme } = useThemeStore();

  return (
    <div className="flex flex-wrap gap-2">
      {THEMES.map((theme) => (
        <button
          key={theme.id}
          onClick={() => setColorTheme(theme.id)}
          title={theme.label}
          className={cn(
            "group flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all",
            colorTheme === theme.id
              ? "border-transparent text-white shadow-sm"
              : "border-border bg-card text-foreground hover:border-primary/40 hover:shadow-sm"
          )}
          style={colorTheme === theme.id
            ? { background: theme.color, borderColor: theme.color }
            : {}
          }
        >
          <span
            className="h-4 w-4 rounded-full border-2 border-white/30 shadow-sm flex-shrink-0"
            style={{ background: theme.color }}
          />
          {theme.label}
          {colorTheme === theme.id && (
            <Check size={13} className="ml-0.5" />
          )}
        </button>
      ))}
    </div>
  );
}
