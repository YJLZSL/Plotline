import { create } from 'zustand';

export interface AiSelection {
  type: string;
  id: string;
  label: string;
  content?: string;
}

export interface AiPromptSuggestion {
  label: string;
  prompt: string;
}

export interface AiContextState {
  view: string;
  viewLabel: string;
  selection: AiSelection | null;
  suggestions: AiPromptSuggestion[];
  setContext: (ctx: Partial<Omit<AiContextState, 'setContext' | 'clearSelection'>>) => void;
  setSelection: (selection: AiSelection | null) => void;
  clearSelection: () => void;
}

export const useAiContextStore = create<AiContextState>()((set) => ({
  view: 'unknown',
  viewLabel: '',
  selection: null,
  suggestions: [],
  setContext: (ctx) => set((state) => ({ ...state, ...ctx })),
  setSelection: (selection) => set({ selection }),
  clearSelection: () => set({ selection: null }),
}));
