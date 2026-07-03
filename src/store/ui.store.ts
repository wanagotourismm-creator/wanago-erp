import { create } from "zustand";
import { persist } from "zustand/middleware";

type UIState = {
  sidebarCollapsed:   boolean;
  mobileSidebarOpen:  boolean;
  commandPaletteOpen: boolean;
  theme:              "light" | "dark" | "system";

  toggleSidebar:       () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar:  () => void;
  openCommandPalette:  () => void;
  closeCommandPalette: () => void;
  setTheme:            (t: UIState["theme"]) => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed:   false,
      mobileSidebarOpen:  false,
      commandPaletteOpen: false,
      theme:              "system",

      toggleSidebar:       () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
      closeMobileSidebar:  () => set({ mobileSidebarOpen: false }),
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
