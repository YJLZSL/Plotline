import { create } from 'zustand';

import type { AiContextSource } from '@/features/ai/contextCollector';
import type { AiActionType } from '@/types/ai';

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
  /** v4.0 Agent 工作流切片：视图请求的待执行快捷动作（如 AI 时间轴查漏）。 */
  pendingAction: AiActionType | null;
  setContext: (ctx: Partial<Omit<AiContextState, 'setContext' | 'clearSelection' | 'setEnabledSources' | 'setPendingAction'>>) => void;
  setSelection: (selection: AiSelection | null) => void;
  clearSelection: () => void;
  setEnabledSources: (sources: AiContextSource[]) => void;
  setPendingAction: (action: AiActionType | null) => void;
}

export const useAiContextStore = create<AiContextState>()((set) => ({
  view: 'unknown',
  viewLabel: '',
  selection: null,
  suggestions: [],
  pendingAction: null,
  enabledSources: [
    'workspaceSummary',
    'timeline',
    'characters',
    'outline',
    'notes',
    'selectedEntity',
  ],
  setContext: (ctx) => set((state) => ({ ...state, ...ctx })),
  setSelection: (selection) => set({ selection }),
  clearSelection: () => set({ selection: null }),
  setEnabledSources: (enabledSources) => set({ enabledSources }),
  setPendingAction: (pendingAction) => set({ pendingAction }),
}));
