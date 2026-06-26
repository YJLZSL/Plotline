import { create } from 'zustand';

import type { AiContextSource } from '@/features/ai/contextCollector';

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
  enabledSources: AiContextSource[];
  setContext: (ctx: Partial<Omit<AiContextState, 'setContext' | 'clearSelection' | 'setEnabledSources'>>) => void;
  setSelection: (selection: AiSelection | null) => void;
  clearSelection: () => void;
  setEnabledSources: (sources: AiContextSource[]) => void;
}

export const useAiContextStore = create<AiContextState>()((set) => ({
  view: 'unknown',
  viewLabel: '',
  selection: null,
  suggestions: [],
  enabledSources: ['workspaceSummary', 'selectedEntity'],
  setContext: (ctx) => set((state) => ({ ...state, ...ctx })),
  setSelection: (selection) => set({ selection }),
  clearSelection: () => set({ selection: null }),
  setEnabledSources: (enabledSources) => set({ enabledSources }),
}));
