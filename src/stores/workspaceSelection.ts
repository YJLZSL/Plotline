import { create } from 'zustand';

interface WorkspaceSelectionState {
  selectedEventId: string | null;
  selectedOutlineNodeId: string | null;
  selectEvent: (id: string | null) => void;
  selectOutlineNode: (node: { id: string; eventId?: string | null } | null) => void;
  clear: () => void;
}

export const useWorkspaceSelectionStore = create<WorkspaceSelectionState>()((set) => ({
  selectedEventId: null,
  selectedOutlineNodeId: null,
  selectEvent: (id) => set({ selectedEventId: id }),
  selectOutlineNode: (node) =>
    set({
      selectedOutlineNodeId: node?.id ?? null,
      selectedEventId: node?.eventId ?? null,
    }),
  clear: () => set({ selectedEventId: null, selectedOutlineNodeId: null }),
}));
