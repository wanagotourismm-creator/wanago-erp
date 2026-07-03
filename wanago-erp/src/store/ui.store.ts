import { create } from "zustand";
import { persist } from "zustand/middleware";

type UIState = {
  sidebarCollapsed:   boolean;
  commandPaletteOpen: boolean;
  theme:              "light" | "dark" | "system";

  toggleSidebar:       () => void;
  setSidebarCollapsed: (v: boolean) => void;
  openCommandPalette:  () => void;
  closeCommandPalette: () => void;
  setTheme:            (t: UIState["theme"]) => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed:   false,
      commandPaletteOpen: false,
      theme:              "system",

      toggleSidebar:       () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      openCommandPalette:  () => set({ commandPaletteOpen: true }),
      closeCommandPalette: () => set({ commandPaletteOpen: false }),
      setTheme:            (theme) => set({ theme }),
    }),
    {
      name:    "wanago-ui",
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        theme:            s.theme,
      }),
    }
  )
);
