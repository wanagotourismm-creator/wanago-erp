import { create } from "zustand";
import { persist } from "zustand/middleware";

type UIState = {
  sidebarCollapsed:   boolean;
  mobileSidebarOpen:  boolean;
  aiAssistantOpen:    boolean;
  theme:              "light" | "dark" | "system";

  toggleSidebar:       () => void;
  setSidebarCollapsed: (v: boolean) => void;
  openMobileSidebar:   () => void;
  closeMobileSidebar:  () => void;
  toggleMobileSidebar: () => void;
  openAIAssistant:     () => void;
  closeAIAssistant:    () => void;
  setTheme:            (t: UIState["theme"]) => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed:   false,
      mobileSidebarOpen:  false,
      aiAssistantOpen:    false,
      theme:              "system",

      toggleSidebar:       () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      openMobileSidebar:   () => set({ mobileSidebarOpen: true }),
      closeMobileSidebar:  () => set({ mobileSidebarOpen: false }),
      toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
      openAIAssistant:     () => set({ aiAssistantOpen: true }),
      closeAIAssistant:    () => set({ aiAssistantOpen: false }),
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
