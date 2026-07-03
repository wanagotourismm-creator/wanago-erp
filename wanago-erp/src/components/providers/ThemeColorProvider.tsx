"use client";

import { useEffect } from "react";
import { useThemeStore, THEMES } from "@/store/theme.store";

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
  const { colorTheme } = useThemeStore();

  useEffect(() => {
    const theme = THEMES.find(t => t.id === colorTheme);
    if (!theme) return;
    const root = document.documentElement;
    root.style.setProperty("--primary",          theme.primary);
    root.style.setProperty("--accent",           theme.primary);
    root.style.setProperty("--ring",             theme.primary);
  }, [colorTheme]);

  return <>{children}</>;
}
