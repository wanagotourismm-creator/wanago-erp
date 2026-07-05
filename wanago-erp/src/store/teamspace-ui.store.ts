import { create } from "zustand";

// Shared open/close state for the Team Space panel — lets TopNav's mail
// icon toggle the panel without mounting useTeamSpace()'s full data-fetching
// hook (which TeamSpacePanel itself already owns).
type TeamSpaceUIState = {
  open: boolean;
  openPanel:   () => void;
  closePanel:  () => void;
  togglePanel: () => void;
};

export const useTeamSpaceUIStore = create<TeamSpaceUIState>((set) => ({
  open: false,
  openPanel:   () => set({ open: true }),
  closePanel:  () => set({ open: false }),
  togglePanel: () => set((s) => ({ open: !s.open })),
}));
