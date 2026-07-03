import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ColorTheme =
  | "green"
  | "blue"
  | "purple"
  | "orange"
  | "rose"
  | "slate";

export type ThemeConfig = {
  id:      ColorTheme;
  label:   string;
  color:   string;
  primary: string;
};

export const THEMES: ThemeConfig[] = [
  { id: "green",  label: "Forest",  color: "#228050", primary: "146 58% 28%" },
  { id: "blue",   label: "Ocean",   color: "#2563eb", primary: "217 91% 60%" },
  { id: "purple", label: "Violet",  color: "#7c3aed", primary: "263 70% 58%" },
  { id: "orange", label: "Sunset",  color: "#ea580c", primary: "22 95% 47%"  },
  { id: "rose",   label: "Rose",    color: "#e11d48", primary: "347 77% 50%" },
  { id: "slate",  label: "Slate",   color: "#475569", primary: "215 25% 37%" },
];

type ThemeState = {
  colorTheme:    ColorTheme;
  setColorTheme: (t: ColorTheme) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      colorTheme:    "green",
      setColorTheme: (colorTheme) => set({ colorTheme }),
    }),
    { name: "wanago-color-theme" }
  )
);
