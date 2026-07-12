import { create } from "zustand";

// Shared open/close state for the Global Search palette — lets TopNav's
// search bar (and the ⌘K shortcut) toggle the palette without either of
// them owning the palette's own data-fetching hook.
type GlobalSearchUIState = {
  open: boolean;
  openPalette:  () => void;
  closePalette: () => void;
  togglePalette: () => void;
};

export const useGlobalSearchUIStore = create<GlobalSearchUIState>((set) => ({
  open: false,
  openPalette:   () => set({ open: true }),
  closePalette:  () => set({ open: false }),
  togglePalette: () => set((s) => ({ open: !s.open })),
}));
